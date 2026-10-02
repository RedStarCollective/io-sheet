/**
 * Iō Sheet bridge
 * Lets https://redstarcollective.github.io/io-sheet/ read this spreadsheet,
 * and save pharma dose changes back into it.
 *
 * Setup (once):
 *   1. In the Google Sheet: Extensions > Apps Script. Paste this whole file over Code.gs. Save.
 *   2. Project Settings (gear icon) > Script Properties > Add property:
 *        EDIT_KEY = a password of your choice (only you should know it)
 *   3. Deploy > New deployment > type "Web app".
 *        Execute as: Me.   Who has access: Anyone.
 *      Authorize when asked. Copy the Web app URL (ends in /exec).
 *   Updating later: Deploy > Manage deployments > pencil icon > Version: New version > Deploy.
 *   That keeps the same URL.
 *
 * Reading is open to anyone with the URL (the same as a view link).
 * Writing needs EDIT_KEY, and can only change pharma dose counts, the Training Area picks, the Trauma Team card, the Nyozi switch and the Public switch.
 * These page settings are kept in Script Properties (TRAINING, TT, NYOZI, HOSTING, FANS), not in sheet cells.
 * HOSTING is the page's Public switch: when it's off, people without the edit key see a "Sheet closed" screen.
 *
 * Case File tab: run setupCaseFile() once (pick it in the function menu at the top, then Run).
 * It creates a "Case File" tab filled with what's on the site now. After that the site reads the tab.
 */

// Only these tabs are ever sent to the page. Update the names here if you rename a tab.
const TABS = ['Stats & Skills [Iō]', 'Skill Improvements', 'Skill Improvement Calculator', 'Case File', 'Stats & Skills Z', 'Ware Z'];

// Tab names are matched loosely (spaces, brackets, capitals and accents ignored), so "Stats & Skills Io" still counts.
function tabKey_(s) { return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9&]+/g, ' ').trim().toLowerCase(); }
function findTab_(ss, name) {
  const want = tabKey_(name);
  return ss.getSheets().filter(function (sh) { return tabKey_(sh.getName()) === want; })[0] || null;
}

function doGet(e) {
  if (e && e.parameter && e.parameter.beat) return beat_(e.parameter);   // visitor heartbeat: answered before any sheet work
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const out = { updated: new Date().toISOString(), sheets: {}, missing: [] };
  TABS.forEach(function (name) {
    const sh = findTab_(ss, name);
    if (sh) out.sheets[name] = sh.getDataRange().getDisplayValues();
    else out.missing.push(name);
  });
  const props = PropertiesService.getScriptProperties();
  try { out.training = JSON.parse(props.getProperty('TRAINING') || 'null'); } catch (err) { out.training = null; }
  try { out.tt = JSON.parse(props.getProperty('TT') || 'null'); } catch (err) { out.tt = null; }
  try { out.nyozi = JSON.parse(props.getProperty('NYOZI') || 'null'); } catch (err) { out.nyozi = null; }
  try { out.hosting = JSON.parse(props.getProperty('HOSTING') || 'null'); } catch (err) { out.hosting = null; }
  try { out.fans = JSON.parse(props.getProperty('FANS') || 'null'); } catch (err) { out.fans = null; }
  try { out.fanseen = JSON.parse(readChunks_(props, 'FANSEEN') || 'null'); } catch (err) { out.fanseen = null; }
  return json_(out);
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'bad request' }); }
  const key = PropertiesService.getScriptProperties().getProperty('EDIT_KEY');
  if (!key || body.key !== key) return json_({ ok: false, error: 'not allowed' });
  if (body.type === 'ping') return json_({ ok: true });
  if (body.type === 'pharma') return json_(savePharma_(body.items || []));
  if (body.type === 'training') return json_(saveTraining_(body));
  if (body.type === 'tt') return json_(saveTT_(body));
  if (body.type === 'nyozi') {
    const n = { active: body.active === true, updated: new Date().toISOString() };
    PropertiesService.getScriptProperties().setProperty('NYOZI', JSON.stringify(n));
    return json_({ ok: true, nyozi: n });
  }
  if (body.type === 'presence') return json_(presence_());
  if (body.type === 'hosting') {
    const h = { open: body.open !== false, updated: new Date().toISOString() };
    PropertiesService.getScriptProperties().setProperty('HOSTING', JSON.stringify(h));
    return json_({ ok: true, hosting: h });
  }
  if (body.type === 'fans') {
    // the order of the fan cards on the Fans tab of the page: a list of names, set by dragging cards in Arrange mode
    const order = (Array.isArray(body.order) ? body.order : []).slice(0, 600).map(function (x) { return String(x).slice(0, 80); });
    const f = { order: order, updated: new Date().toISOString() };
    const txt = JSON.stringify(f);
    if (txt.length > 9000) return json_({ ok: false, error: 'too many fans to store' });
    PropertiesService.getScriptProperties().setProperty('FANS', txt);
    return json_({ ok: true, fans: f });
  }
  if (body.type === 'fanseen') {
    // games each fan has appeared in since: { "Fan name": [{gig, link?}, ...] }, entered in the fan file on the page
    const src = body.seen && typeof body.seen === 'object' ? body.seen : {}, clean = {};
    Object.keys(src).slice(0, 600).forEach(function (k) {
      const list = (Array.isArray(src[k]) ? src[k] : []).slice(0, 40).map(function (x) {
        const o = { gig: String(x && x.gig || '').slice(0, 120) };
        if (x && x.link && /^https?:\/\//i.test(String(x.link))) o.link = String(x.link).slice(0, 300);
        return o;
      }).filter(function (o) { return o.gig; });
      if (list.length) clean[String(k).slice(0, 80)] = list;
    });
    const txt = JSON.stringify(clean);
    if (txt.length > 160000) return json_({ ok: false, error: 'too much to store' });
    writeChunks_(PropertiesService.getScriptProperties(), 'FANSEEN', txt);
    return json_({ ok: true });
  }
  return json_({ ok: false, error: 'unknown request' });
}

/** Finds the "Pharma" list on the Stats tab and writes each dose count two columns to the right of its name. */
function savePharma_(items) {
  const sh = findTab_(SpreadsheetApp.getActiveSpreadsheet(), TABS[0]);
  if (!sh) return { ok: false, error: 'Stats tab not found' };
  const vals = sh.getDataRange().getDisplayValues();
  let hr = -1, hc = -1;
  for (let r = 0; r < vals.length && hr < 0; r++) {
    for (let c = 0; c < vals[r].length; c++) {
      if (String(vals[r][c]).trim() === 'Pharma') { hr = r; hc = c; break; }
    }
  }
  if (hr < 0) return { ok: false, error: 'Pharma list not found' };
  const norm = function (s) { return String(s).trim().toLowerCase(); };
  const saved = [];
  items.forEach(function (it) {
    const n = Math.round(Number(it.n));
    if (!isFinite(n) || n < 0 || n > 999) return;
    for (let r = hr + 1; r < Math.min(vals.length, hr + 30); r++) {
      if (norm(vals[r][hc]) === norm(it.name)) {
        sh.getRange(r + 1, hc + 3).setValue(n);
        saved.push(it.name);
        break;
      }
    }
  });
  return { ok: true, saved: saved };
}

/** Stores whether the Training Area is active and which (up to three) skills are Practiced. */
function saveTraining_(body) {
  const skills = (Array.isArray(body.skills) ? body.skills : []).map(function (s) { return String(s).slice(0, 80); }).slice(0, 3);
  const t = { active: body.active === true, skills: skills, updated: new Date().toISOString() };
  PropertiesService.getScriptProperties().setProperty('TRAINING', JSON.stringify(t));
  return { ok: true, training: t };
}

/** Stores the Trauma Team card: active, tier (silver or executive) and weeks left. */
function saveTT_(body) {
  const w = body.weeks === '' || body.weeks == null ? '' : Math.max(0, Math.min(520, Math.round(Number(body.weeks)) || 0));
  const t = { active: body.active === true, tier: (body.tier === 'executive' || body.tier === 'platinum') ? 'executive' : 'silver', weeks: w, updated: new Date().toISOString() };
  PropertiesService.getScriptProperties().setProperty('TT', JSON.stringify(t));
  return { ok: true, tt: t };
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Run once: creates the "Case File" tab, filled with the site's current Case File content.
 * It refuses to run if the tab already exists, so it can never overwrite your drafts.
 */
function setupCaseFile() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (findTab_(ss, 'Case File')) throw new Error('A "Case File" tab already exists. Nothing was changed.');
  const sh = ss.insertSheet('Case File');
  const rows = CASEFILE_SEED;
  sh.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sh.setColumnWidth(1, 190); sh.setColumnWidth(2, 260); sh.setColumnWidth(3, 620); sh.setColumnWidth(4, 200); sh.setColumnWidth(5, 160);
  sh.getRange(1, 1, rows.length, rows[0].length).setWrap(true).setVerticalAlignment('top').setFontFamily('Arial').setFontSize(10);
  sh.getRange(1, 1).setFontWeight('bold').setFontSize(14).setFontColor('#9f0c17');
  sh.getRange(1, 2, 1, 4).merge().setFontColor('#666666').setFontStyle('italic');
  for (let r = 0; r < rows.length; r++) {
    if (String(rows[r][0]).indexOf('##') === 0) {
      sh.getRange(r + 1, 1, 1, rows[0].length).setBackground('#9f0c17').setFontColor('#ffffff').setFontWeight('bold');
      sh.getRange(r + 2, 1, 1, rows[0].length).setBackground('#efe7dc').setFontWeight('bold');
    }
  }
  sh.setFrozenRows(1);
  ss.setActiveSheet(sh);
}

// The site's Case File content at the time this script was written; only used by setupCaseFile().
const CASEFILE_SEED = [
[
"CASE FILE",
"Draft here. The Iō web sheet reads this tab on every load. Add or delete rows inside a section. Keep each ## row and the header row under it. Alt+Enter starts a new line; a blank line starts a new paragraph.",
"",
"",
""
],
[
"",
"",
"",
"",
""
],
[
"## BRIEF",
"",
"",
"",
""
],
[
"Field",
"Answer",
"",
"",
""
],
[
"Origin",
"Highrider [O'Neill Two]",
"",
"",
""
],
[
"Personality (sober)",
"Serious, Intellectual, Warm, Caring",
"",
"",
""
],
[
"Personality (on drugs)",
"Visionary",
"",
"",
""
],
[
"Values most",
"Education. Liberation.",
"",
"",
""
],
[
"Life goal",
"Serve his family's legacy. Honor their deaths.",
"",
"",
""
],
[
"Most valued person",
"Grandfather. Ikbir Singh.",
"",
"",
""
],
[
"Most valued possession",
"Father's Glasses.",
"",
"",
""
],
[
"Family crisis",
"Parents died in the Seven Hour War.",
"",
"",
""
],
[
"Childhood",
"Relatively privledged life on one of the nicer stations.",
"",
"",
""
],
[
"Family background",
"Mother was a botanist/worker on Galileo. Father did something ???",
"",
"",
""
],
[
"",
"",
"",
"",
""
],
[
"## HISTORY",
"",
"",
"",
""
],
[
"Era",
"Title",
"Text",
"Source",
""
],
[
"Age 7",
"The Seven Hour War",
"Kōru Singh learned what revolution meant at age seven, when his parents died helping birth the Highrider nation. Killed by O'Neill security forces during the Seven Hour War, their martyrdom left him with a complex legacy - revolutionary heroes to everyone except their son, who was left trying to understand why they chose the cause over watching him grow up. His grandfather Ikbir, an engineer who had lost his only child that day, raised him with a mix of love and guilt that would later shape his worldview.",
"RSC Lore · Dr. Kōru Singh",
""
],
[
"Orbit",
"The Workgang",
"Life in orbit taught him early lessons about collective survival. His workgang became the siblings he never had, teaching him that individual needs must sometimes be subsumed for group survival. These bonds, forged in the unforgiving environment of space, gave him both a strong sense of community and a firsthand understanding of how different systems of social organization could be. During these years, he studied martial arts intensely, a bridge between his parents memory and him, it became a sole object of his attention. Ikbir, amongst others, worked to help him study under the best the Highrider's could offer.",
"RSC Lore · Dr. Kōru Singh",
""
],
[
"Copernicus",
"Aerospace Medicine",
"His excellent academic performance earned him entrance to medical school on Copernicus, where he specialized in Aerospace Medicine with a focus in Bioadaptive Mechanisms. His studies combined emergency medicine, chemical engineering, and cryogenics - everything needed to help humans survive and thrive in the harshest environments. His research focused particularly on compounds that could push human adaptation beyond normal limits, preparing bodies for everything from extended hibernation to radiation exposure to radical environmental changes.",
"RSC Lore · Dr. Kōru Singh",
""
],
[
"The DataKrash",
"Ikbir Goes Groundside",
"While Kōru studied orbital medicine, Ikbir made a fateful decision. Having seen his grandson secure in his studies, the elder Singh cashed in his last favors for a ticket to Night City. Driven by an obsession with honoring his dead daughter, he intended to organize workers in hopes of replicating the Highrider revolution groundside. The DataKrash meant eight years of sparse communication between grandfather and grandson.",
"RSC Lore · Dr. Kōru Singh",
""
],
[
"2043",
"Stranded in Night City",
"In 2043, on the eve of his first deep space expedition, Kōru negotiated a brief stopover in Night City to check on his grandfather. Alas, finding him wasn't easy, what was supposed to be a few days stretched to weeks. His ride departed back without him. Highrider authorities marking him as defector. When he did find Ikbir, he was on the precipice of death. One Io has slowly nursed him back from.\n\nWith no way back to orbit, Kōru converted an abandoned medical office in South Night City into the Comrade Clinic. His early experiences there would shape everything that followed, leading eventually to the founding of the Red Star Collective.",
"RSC Lore · Dr. Kōru Singh",
""
],
[
"2043 – 2045",
"Foundations",
"The true origins of the Red Star Collective lie not in grand revolutionary actions, but in the daily work of keeping people alive. When Kōru Singh, now known as Iō, established the original Comrade Clinic in 2043, it was with considerably more ideology than resources. Our records from this period paint a picture not of an emerging movement, but of a single overwhelmed medtech trying to put his principles into practice.\n\nThe \"Comrade Clinic\" occupied a small, abandoned medical office in South Night City, sparsely appointed with salvaged medical equipment, stolen \nsupplies, and a waiting room furnished with cheap used furniture.\n\nThe donation-based payment model, while aligned with his Marxist principles, proved brutally demanding in practice. A week's logs tell the story: three construction workers with severe chemical burns from illegal corp dumping, a family of five with radiation sickness from a leaking power converter, two children with malnutrition-induced organ failure, and innumerable combat injuries from the petty wars fought on the streets. Most couldn't pay anything. Those who could offered trades - street food, salvaged tech, \"services\", or sometimes information.\n\nThe reality of combat zone medicine quickly overwhelmed any thoughts of broader organizing. Many nights, Iō worked alone until exhaustion forced him to rest, only to be woken by the next emergency. Equipment broke down regularly - we noted three instances where he performed surgery using a flashlight because he couldn't afford to fix the surgical lamps. Political discussions, when they happened at all, were limited to quiet conversations with occasional patients who shared his theoretical interests.\n\nThe arrival of Minata Tindano marked the first real change in the clinic's operations. An NCU medical school , living in the building next door, she began helping initially with simple tasks - cleaning, organizing supplies, managing the waiting room. Over time, Iō took her under as a apprentice, giving him his first real assistance and occasional relief.\n\nBy early 2045, the clinic's limitations had become painfully clear. Our analysis shows monthly expenses running at least 2000eb over income. The donation model, while philosophically sound, simply couldn't sustain operations in an environment where most patients were choosing between medical care and food.\n\nThis crisis point led Iō to consider options he'd previously dismissed. His first meetings with fixers occurred during this period, initially seeking cheaper supply sources. It's our belief that the transition to edgerunning work was driven by desperate necessity - edgerunning jobs paid well enough to keep the clinic supplied and operating.\n\nOur intelligence from this period suggest  Iō taking increasingly high-risk contracts, primarily as combat and medical support for other edgerunner teams. The combat drugs common in this work - particularly Boost and Primetime - seemed to lower his inhibitions about expressing political views that he'd previously kept private.\n\nThis period also marked the beginning of his relationship with Fey, a fixer operating out of the Velvet Curtain. Our intelligence suggests their early interactions centered around strictly merc work. Fey's network provided access to resources and connections that would prove crucial in the clinic's early evolution.\n\nHowever, the growing contradiction between his edgerunning work and the clinic's operation created increasing strain. Records show the clinic's hours becoming erratic as jobs rendered Iō out of commission for days at at time. While the improved funding allowed for better supplies and equipment, Minata was left handling an increasing patient load alone. To make matters more difficult, Iō was taking out heavy loans to fund cyber purchases that would allow him to survive increasingly dangerous work. The situation wasn't sustainable.\n\nThe breaking point came during an moment our files designate as \"The Red Venetian.\" During a high-profile heist that went loud, Iō was captured on feeds putting his foot through a painting of General Donald Lundee and loudly proclaiming his Marxist agenda to a crowd of frightened execs, before getting shot at multiple times all while continuing his sermon The footage, which briefly went viral on several Garden patches, made his previously quiet political work very public.\n\nThis exposure forced hard decisions. It was well assumed he was now wanted by the NCPD as a revolutionary terrorist of some form, he'd also drawn the ire of segments of the business community. Essentially, the original clinic's location and operation had become untenable. It was Fey, who provided a solution - intelligence about an abandoned warehouse that could be \"acquired\" with the right application of force. The operation to secure this space marked the first time Iō actively planned and led a direct action rather than serving as support. This success, combined with the resources and reputation built through edgerunning, suggested larger possibilities.",
"RSC Lore · History",
""
],
[
"Mid 2045",
"Transformation",
"The summer of 2045 thus saw the clinic operation relocated and expanded into this new space, which would become the first People's Center. This represented a shift from purely medical mutual aid to broader ambitions. Perhaps most importantly, it attracted the attention of others who shared Iō's political vision. The forming of what would become the core cadre.\n\nThe early People's Center reflected a marriage of ideology and necessity. Our surveillance photos show a spartan facility: fold-up tables, used training mats, and minimal equipment. The clinic stood out as the only well-appointed space, thanks to medical equipment left behind in the claimed building. The daily schedule began with the breakfast program, Chan-Woo Park's expertise turning Badlands-scavenged organics into nutritious if bland protein wafers via a used \"Mr. Biscuit\". These communal meals naturally fed into Iō's morning martial arts classes, which combined practical self-defense with discussions of community protection.\n\nAfternoon programs showcased the diverse skills of early members. Leonard Turner's construction workshops taught basic repair and maintenance skills crucial for CZ survival. Nomar Otero's classes covered everything from spotting surveillance to navigating gang territories safely. These practical skills sessions served as entry points for political education, with instructors naturally linking daily struggles to broader systemic issues.\n\nThe clinic remained central to operations, but now served as one part of a broader strategy, increased coordination between medical care and other programs. Patients receiving treatment would be connected to relevant workshops or study groups. Those attending classes were made aware of medical services. This cross-pollination helped build both a deeper class consciousness and a sense of solidarity.\n\nVery soon though, this fledgling Center would find itself at the receiving end of much more heightened attention.\n\nThe Continental Brands action, while appearing planned in security reports, was actually an improvisational reflex. During what should have been a routine kibble truck heist, a split-second decision was made to transform the operation into political theatre. Surveillance footage shows Iō and Sherwood intercepting a kibble delivery truck en route, then conducting an impromptu distribution campaign through the Combat Zones.\n\nThe image of the bearded Highrider and his blue donned companion driving through the streets, passing out food to surprised residents, quickly became local legend. The operation culminated in theatrical fashion - the truck, set ablaze, was sent unmanned into a flagship Oasis storefront, the two then distributing food inside to the Street, an event corporate media dubbed \"a heinous act of terrorism\". This was exactly the contradictory imagery he hoped would serve as effective propaganda.\n\nCorporate response escalated beyond the expected NCPD warrants. Continental Brands deployed a professional hit squad - five operators with military-grade cyberware - to intercept Iō during an unrelated edgerunning operation. Reports show he repelled the attack with help from fellow edgerunner Akko Irons and, surprisingly, members of the Cult of Asymmetry - a group that would later be deradicalized and integrated into the People's Center's volunteer base.\n\nThe incident forced operational changes. Iō could no longer safely operate outside the Combat Zone's relative protection, significantly limiting the RSC's early expansion efforts. However, the actions had unintended positive consequences. The image of a revolutionary not just talking about feeding people but actually doing it - and facing corporate death squads as a result - significantly boosted the RSC's street credibility. Recruitment increased, particularly among Combat Zone residents who witnessed the food distribution firsthand. The Continental Brands action, though improvised, achieved something carefully planned propaganda rarely manages: authentic resonance with the daily struggles of Night City's working class.\n\nIn the months following the Oasis exhibit, the People's Center began to take on more coherent shape. The Center, while still operating on minimal resources, developed a more structured approach to its revolutionary work. Intelligence reports from this period show an evolution from pure survival operations to genuine political organizing. One figure would prove to be essential to this transition. Yves Savatier, lovingly known to the Street as Le Fou.\n\nThe partnership that would come to define the organization began with a chance meeting at the Velvet Curtain. Intelligence suggests the initial conversation was unremarkable - simply edgerunners talking shop. However, Iō recognized something in the NCU professor's frustrations with academic life and obvious care for their students: untapped revolutionary potential.\n\nLe Fou's background merits attention. Beyond their position as a theatre professor, they maintained connections to the Julliard's, a prominent protector gang for street performers. Our files indicate deep family ties to the gang, though the exact nature of their organizational work remains unclear. More importantly, Le Fou had developed a side business as a fixer, using their academic position to siphon resources from NCU while building a network of street-level contacts.\n\nThe subsequent pitch meeting between the two proved crucial. Iō laid out his vision for building a genuine revolutionary party in Night City, while Le Fou saw an opportunity to make concrete the change they couldn't achieve through academic channels. This was the beginning of the RSC proper.\n\nLe Fou's position at Night City University proved particularly valuable, allowing them to direct resources to the Center while maintaining their cover as a theatre professor. Our surveillance indicates they were particularly adept at identifying potential recruits among their students, carefully directing politically conscious youth toward the Center's programs while maintaining operational security.\n\nThe integration of former Cult of Asymmetry members mark an important development in the RSC's approach to recruitment and political education. Rather than simply absorbing these individuals, the organization engaged in a focused rehabilitation - a process of helping former cult members redirect their need for meaning and community into practical organizing work. This success would later inform their approach to recruiting from other groups.\n\nSecurity measures evolved through necessity. Beyond the constant occupation of the space and Le Fou's network of street contacts providing early warning of threats, the organization developed more sophisticated vetting processes for new members. Volunteers would be gradually integrated through practical work before being brought into more sensitive operations. This period of relative stability allowed for more systematic political education.\n\nThe radiation medicine campaign grew from unexpected circumstances. Our intelligence indicates the catalyst wasn't planned action but a simple delivery job booked through one of Night City's numerous edgerunning apps. Surveillance footage shows Iō, alongside edgerunners Dugan and Future, delivering what they believed to be standard cargo to a South Night City housing complex. The situation changed when 6th Street members met them at the drop point. Their casual discussion of \"market forces\" and \"meeting demand\" revealed the truth - they were price gouging desperately needed radiation medication.\n\nWhat followed demonstrates the lack of inhibition that has so far marked Io's career as an edgerunner. After sending his fellow edgerunners away, Iō infiltrated the 6th Street position under pretense of recruitment. The subsequent assault - smashing the leader's head into a table and diving through a window with the medication - was merely prelude.\n\nEyewitness testimony speaks to Iō, bleeding and surrounded, delivering what our analysts identify as a textbook example of agitational speech. He corralled the neighborhood with pointed rhetoric, inspirational appeals. The ensuing confrontation would prove costly. In the chaos of the mass action, with residents overwhelming 6th Street positions, Iō lost an arm - likely shot off and trampled in the crowd. However, the arrival of RSC members turned the tide. Our footage shows Arina Morozov, Chan-woo Park, Leonard Turner, Minata Tindano, and Nomar Otero, amongst others helping to coordinate the neighborhood's resistance, ultimately driving 6th Street from the area, and distributing the stolen medication.\n\nThis action had lasting consequences. The neighborhood's relationship with the RSC strengthened considerably, providing a base for future organizing. While 6th Street nursed a grudge, their embarrassing defeat and clear exposure as profiteers made them reluctant to pursue open conflict. More importantly, the incident established the RSC's authenticity.\n\nFollowing the confrontation with 6th Street, the RSC faced a new challenge. Having demonstrated the possibility of collective action, they now bore responsibility for ensuring its continuation. Our surveillance indicates it was Media figure Dugan of Valor and Gallantry who first pushed for comprehensive action, recognizing that the limited supply of radiation medication created both opportunity and obligation.\n\nThe planning meetings at Kafe Kafka reveal contested disagreements. Dugan pushed for prioritizing consistent medical supply and distribution, warning against turning residential areas into war zones. Iō advocated for arming and organizing community members, arguing that without the means for self-defense, any gains would prove temporary. Le Fou's role proved crucial, helping synthesize these perspectives into workable strategy.\n\nIntelligence gathered from these meetings shows careful consideration of multiple factors. The RSC recognized that 6th Street's expulsion, while tactically successful, created a power vacuum that Maelstrom might exploit. Their analysis suggests Maelstrom had already attempted to seize the radiation medicine market, explaining their earlier encounters during supply runs. This forced consideration of how to prevent one exploitative force simply replacing another.\n\nThey decided rather than directly confronting either gang, they planned to manipulate existing tensions between Maelstrom and 6th Street. By leaking information about medical supply sources to both groups, they aimed to provoke direct conflict between the gangs while creating opportunity for their own acquisition of supplies.\n\nLe Fou's connections provided intelligence on potential supply sources and security measures. More importantly, they helped develop sustainable community defense in the affected neighborhoods - providing discounted weapons and training to local residents while maintaining the RSC's role as supporter rather than direct controller.\n\nThis approach marked significant evolution in RSC operations. Unlike the spontaneous action against 6th Street, this required careful coordination between multiple actors: Dugan's media connections, Le Fou's fixer networks, and the RSC's growing organizational capacity.\n\nThe plan involved multiple teams working in concert: one group manipulating gang tensions, another infiltrating Biotechnica facilities, and a third coordinating logistics.  Initial phases proved successful - the team first secured iodine components through elaborate deception involving the Piranhas. Using stolen credentials from Biotechnica executive Dr. Anna Li, the team penetrated facility security. By carefully timing information leaks and using Collateral's connections to Maelstrom, they sparked what corporate media would later describe as \"inexplicable gang violence over air filters.\" This cover story, notably promoted by local law enforcement's xenophobic rhetoric, provided perfect concealment for the actual operation.\n\nHowever, success proved costly. Police response to the engineered gang conflict trapped Collateral in the crossfire. Iō's attempt to extract her led to his capture by police drones, though our footage shows an impressive escape involving a commandeered AV-4 and mid-air bailout. This marked his closest brush with death to date, though not his last.\n\nThe operation's ultimate compromise came from an unexpected quarter. Duncan, a Militech executive and brother to their ally Dugan, had been monitoring the operation. His decision to seize the majority of the recovered medicine, motivated by what our analysts identify as personal rivalry rather than corporate strategy. Our surveillance shows Dugan nearly defeating his cybernetically enhanced brother in single combat, only to lose on a technicality. The negotiated settlement - trading half the medicine and valuable intelligence for their lives - represented a significant setback to the RSC's ambitious plans.\n\nThis phase of operations concluded with Iō performing emergency surgery on Chan-woo Park with severely limited resources. The RSC secured only a fraction of their intended supplies, though their demonstration of capability and willingness to sacrifice for the community would prove valuable for future organizing.\n\nWithout their primary stockpile of radiation medicine and with increased attention on their HQ, the People's Center facility, its location now compromised, required immediate evacuation.\n\nDespite limited supplies, RSC organizers maintained distribution networks through decentralized community points. Our surveillance indicates Le Fou's earlier work arming neighborhood residents proved crucial - creating the infrastructure needed to distribute the medicine unencumbered.\n\nThe RSC would enter a period of strategic reorganization. Leadership operated from a series of safe houses while seeking new permanent facilities. It was not long before an unexpected boon emerged in Marco Rojas, a former firefighter who had independently begun organizing an RSC cell in South Night City.\n\nThe convergence with Rojas's cell proved fortuitous. Our intelligence indicates a crew of edgerunners - Akko Irons, Collateral, and Niko - had been contracted by a Gunmart executive to eliminate Rojas's operation. Instead, recognizing the RSC's work, they aided in clearing and securing an abandoned precinct building in Northwest South Night City, near the University Cargo Bay.\n\nThis new location, while initially dilapidated, offered strategic advantages. The precinct's existing security infrastructure could be repurposed, and its location near both the docks and the university cargo bay provided cover for various activities. The RSC launched a renovation campaign, mobilizing community resources and volunteers to transform the space.",
"RSC Lore · History",
""
],
[
"Mid – Late 2046",
"Consolidation",
"By early 2046, the renovated People's Center emerged more capable than its predecessor.  It would bear host to significantly improved medical facilities, a dedicated training wuguan, expanded community spaces, and hardened security measures. Most importantly, the organization had learned from its near-destruction. New protocols emphasized operational security, distribution of resources across multiple sites, and deeper integration with community defense networks.\n\nThis marked the RSC's emergence as a more public force in Night City politics. The renovation of the People's Center coincided with a significant leadership development - Le Fou's resignation from Night City University to assume full co-chair responsibilities alongside Iō. This transition from covert to open revolutionary work reflected growing organizational confidence and capability.\n\nA crucial expansion in the RSC's influence came through Iō's participation in the Starborne Showdown, coinciding with the opening of Morro Rock International Spaceport. This victory did more than enhance his personal reputation - it renewed his connections with his Highrider brethren. Our intelligence indicates he successfully pitched a partnership, securing Highrider sponsorship for RSC operations in South Night City in exchange for providing positive press and establishing a foothold for Highrider interests.\n\nThe organization's coalition building accelerated during this period. Surveillance logs show successful integration of diverse groups: a contingent of Moe posergangers brought youth energy and street presence, while alliance with the Line of Feanor, an elf-sculpt protector gang, expanded their reach in South Night City. The addition of a Gardeners sect, supported by Highrider resources to secure nearby facilities, further demonstrated their growing sophistication in building revolutionary alliances.\n\nStorm Ardent provided the ultimate test of their organizational model. The People's Center transformed into a crucial refuge, while RSC organizers coordinated rescue operations and supply distribution throughout South Night City. Our analysis suggests their response significantly limited storm damage in their operational areas. More importantly, the sustained round-the-clock operation of their clinic and kitchen demonstrated practical revolutionary mutual aid in crisis conditions.\n\nIn the storm's aftermath, the RSC's practical capabilities drew increased attention. Le Fou's work finding housing and employment for displaced residents expanded their support base. According to our sources, this period saw substantial growth in volunteer numbers, attracted by the organization's demonstrated commitment to community needs.",
"RSC Lore · History",
""
],
[
"Now",
"In the Ring",
"These days, he's become one of Night City's most visible Highrider figures, though not in ways anyone expected. Three nights a week, he steps into fight venues across the city, demonstrating martial arts preserved through generations in orbit. In Combat Zone rings like The Slammer and the Redline, his matches draw crowds from every level of society - Combat Zone residents, corporate fight fans, and increasingly, young Highriders exploring ground culture.\n\nBetween rounds, he talks about Highrider history and philosophy, weaving revolutionary theory into stories about orbital life. These impromptu seminars are meant to bridge cultural divides as more Highriders establish groundside presence. The prize money funds RSC operations, but the platform serves broader purposes - showcasing Highrider martial excellence, building connections between orbital and ground communities, and introducing marxist theory to new audiences.\n\nHis grandfather, now receiving treatment through Highrider medical programs, watches the People's Center's growth with a pride that eases some of their shared pain. Whether this path leads to revolution or ruin remains to be seen, but Iō pursues it with the same determination that once helped his people secure their independence among the stars.",
"RSC Lore · Dr. Kōru Singh",
""
],
[
"",
"",
"",
"",
""
],
[
"## OPEN THREADS",
"",
"",
"",
""
],
[
"Title",
"Source",
"Text",
"",
""
],
[
"",
"",
"",
"",
""
],
[
"## PEOPLE",
"",
"",
"",
""
],
[
"Name",
"Role",
"Text",
"Group",
"Posse ID"
],
[
"Ikbir Singh",
"Grandfather · most valued person",
"An engineer who had lost his only child that day, raised him with a mix of love and guilt that would later shape his worldview. Now receiving treatment through Highrider medical programs.",
"Family",
""
],
[
"His mother",
"Died in the Seven Hour War",
"A botanist/worker on Galileo.",
"Family",
""
],
[
"His father",
"Died in the Seven Hour War",
"Did something ???",
"Family",
""
],
[
"Arina Morozov",
"Partner · Posse",
"Lives with him on Morro Rock. Strong willed and uncompromising.",
"Friends",
"arina"
],
[
"Chan Woo Park",
"Friend · Posse",
"Driver and lives with him on Morro. Stoic and wise. Weak for the Elves",
"Friends",
"chanwoo"
],
[
"Alain Antonov",
"Friend",
"Main Highrider liason.",
"Friends",
""
],
[
"",
"",
"",
"",
""
],
[
"## ENEMIES",
"",
"",
"",
""
],
[
"Who",
"What caused it",
"What they can throw",
"What happens",
""
],
[
"Anti-Communists",
"Being a Communist",
"Fascists",
"Immortal Science",
""
],
[
"Anti-Spacers",
"Being from Space",
"Groundsiders",
"Spaceman Gatorade",
""
],
[
"",
"",
"",
"",
""
],
[
"## PRESENTATION",
"",
"",
"",
""
],
[
"Field",
"Answer",
"",
"",
""
],
[
"Quote",
"Those who work with him glimpse different sides of his personality. In the clinic, he maintains calm focus during emergencies while cracking dry jokes that help patients relax. His fight persona combines theatrical charisma with careful aggression. With trusted comrades, a quieter, more reflective person emerges - one who studies everything from Lenin to Lao Tzu, searching for frameworks to understand both personal and systemic suffering.",
"",
"",
""
],
[
"Clothing style",
"Leisurewear/Urban Flash. Think comfortable Streetwear.",
"",
"",
""
],
[
"Hairstyle",
"Tied Top Bun, Long Beard",
"",
"",
""
],
[
"",
"",
"",
"",
""
],
[
"## OUTFITS",
"",
"",
"",
""
],
[
"Name",
"Pieces",
"Art",
"",
""
],
[
"RSC Tracksuit/Hoodie and Joggers/Half Samui Gi/Hoodie [Cold Weather Lining]",
"Leisurewear Bottom x3, Top x2, Jacket x4, Shoes x3",
"",
"",
""
],
[
"RSC Fatigues with Turban",
"Gang Colors Bottom, Top, Jacket, Footwear, Glasses, Hat",
"",
"",
""
],
[
"Doctor's Outfit and Scrubs",
"Generic Chic Bottom, Top, Jacket, Footwear",
"",
"",
""
],
[
"Cuban Shirt and Shorts",
"Bohemian Bottoms, Top, Jacket, Footwear, Glasses",
"",
"",
""
],
[
"Highrider Jacket and Streetwear",
"Urban Flash Jacket x2, Top x3, Bottom x2, Footwear, Glasses",
"",
"",
""
],
[
"Formal Samue (Sourced in Japan)",
"Businesswear Samue Suit [LOOT]",
"",
"",
""
],
[
"Galileo Turtleneck Euro Solo",
"Full Businesswear, Suit and Shoes",
"",
"",
""
],
[
"",
"",
"",
"",
""
],
[
"## PAPERS",
"",
"",
"",
""
],
[
"Name",
"Status",
"Term",
"Count",
"Note"
],
[
"Demolitions License",
"Licensed",
"",
"",
""
],
[
"Heavy Weapons License",
"Licensed",
"",
"",
""
],
[
"Pilot's License",
"Licensed",
"",
"",
""
],
[
"Driver's License",
"Licensed",
"1 month",
"",
""
],
[
"Air Vehicle Plate [NYOTA]",
"Plate",
"1 month",
"",
""
],
[
"Forged Vehicle Plate",
"Forged",
"",
"2",
""
],
[
"Tsunami Pulse Laser Registration",
"Registered",
"",
"",
"Shared with C1"
]
];


/**
 * Who's looking (for the page's viewer avatars). Visitors send a small heartbeat every ~40s while the page is open.
 * Kept in the script cache for a few minutes only. No names, accounts or addresses: just a random id per browser tab,
 * which tab of the sheet it's on, and Iō or Zolo. Only the edit-key holder can read the list.
 */
const PRESENCE_TTL_MS = 75000;
function readPresence_() { let m = {}; try { m = JSON.parse(CacheService.getScriptCache().get('PRESENCE') || '{}'); } catch (err) {} return m; }
function beat_(p) {
  const id = String(p.beat).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24);
  if (!id) return json_({ ok: false });
  const lock = LockService.getScriptLock();
  try { lock.waitLock(3000); } catch (err) { return json_({ ok: false, error: 'busy' }); }
  try {
    const now = Date.now(), m = readPresence_();
    Object.keys(m).forEach(function (k) { if (now - m[k].t > PRESENCE_TTL_MS) delete m[k]; });
    if (p.bye) delete m[id];
    else m[id] = { t: now, since: (m[id] && m[id].since) || now, tab: String(p.tab || '').slice(0, 20), who: String(p.who || '').slice(0, 8) };
    CacheService.getScriptCache().put('PRESENCE', JSON.stringify(m), 600);
    if (!p.bye) PropertiesService.getScriptProperties().setProperty('LAST_SEEN', String(now));
  } finally { lock.releaseLock(); }
  return json_({ ok: true });
}
function presence_() {
  const now = Date.now(), m = readPresence_();
  const viewers = Object.keys(m).filter(function (k) { return now - m[k].t <= PRESENCE_TTL_MS; })
    .map(function (k) { return { id: k, tab: m[k].tab, who: m[k].who, since: m[k].since, ago: now - m[k].t }; });
  return { ok: true, viewers: viewers, lastSeen: Number(PropertiesService.getScriptProperties().getProperty('LAST_SEEN') || 0), now: now };
}


// Script Properties hold about 9 KB per value, so longer JSON is split across KEY_0, KEY_1, ... with KEY_N = how many.
function writeChunks_(props, key, txt) {
  const old = +(props.getProperty(key + '_N') || 0), n = Math.ceil(txt.length / 8000) || 1;
  for (let i = 0; i < n; i++) props.setProperty(key + '_' + i, txt.slice(i * 8000, (i + 1) * 8000));
  for (let i = n; i < old; i++) props.deleteProperty(key + '_' + i);
  props.setProperty(key + '_N', String(n));
}
function readChunks_(props, key) {
  const n = +(props.getProperty(key + '_N') || 0); let s = '';
  for (let i = 0; i < n; i++) s += props.getProperty(key + '_' + i) || '';
  return s;
}
