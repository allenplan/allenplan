import {groupSchedule, isImportedDars, scheduleFromDars} from './schedule.mjs';

//TODO: REMOVE
let temp_finished_classes = [
    {
        "name": "ENGL 111",
        "courseType": [
            "C"
        ],
        "credits": 5,
        "notes": "Finished course"
    },
    {
        "name": "CSE 110",
        "courseType": [
            "RSN",
            "NSc"
        ],
        "credits": 5,
        "notes": "Finished course"
    },
    {
        "name": "CHID 206",
        "courseType": [
            "WRITING",
            "DIV"
        ],
        "credits": 5,
        "notes": "Finished course"
    },
    {
        "name": "ENGL 204",
        "courseType": [
            "WRITING",
            "A&H"
        ],
        "credits": 5,
        "notes": "Finished course"
    },
    {
        "name": "PHIL 102",
        "courseType": [
            "A&H"
        ],
        "credits": 5,
        "notes": "Finished course"
    },
    {
        "name": "MUSIC 160",
        "courseType": [
            "A&H"
        ],
        "credits": 5,
        "notes": "Finished course"
    },
    {
        "name": "ESRM 100",
        "courseType": [
            "SSc"
        ],
        "credits": 5,
        "notes": "Finished course"
    },
    {
        "name": "POL S 202",
        "courseType": [
            "SSc"
        ],
        "credits": 5,
        "notes": "Finished course"
    },
    {
        "name": "POL S 204",
        "courseType": [
            "SSc"
        ],
        "credits": 5,
        "notes": "Finished course"
    },
    {
        "name": "PHIL 120",
        "courseType": [
            "SSc"
        ],
        "credits": 5,
        "notes": "Finished course"
    },
    {
        "name": "PSYCH 101",
        "courseType": [
            "SSc"
        ],
        "credits": 5,
        "notes": "Finished course"
    },
    {
        "name": "BIOL 161",
        "courseType": [
            "NSc"
        ],
        "credits": 5,
        "notes": "Finished course"
    },
    {
        "name": "BIOL 162",
        "courseType": [
            "NSc",
            "CS-NSc"
        ],
        "credits": 5,
        "notes": "Finished course"
    },
    {
        "name": "CSE 121",
        "courseType": [
            "NSc"
        ],
        "credits": 4,
        "notes": "Finished course"
    },
    {
        "name": "MATH 124",
        "courseType": [
            "NSc",
            "CS-MATH"
        ],
        "credits": 5,
        "notes": "Finished course"
    },
    {
        "name": "MATH 125",
        "courseType": [
            "NSc",
            "CS-MATH"
        ],
        "credits": 5,
        "notes": "Finished course"
    },
    {
        "name": "CSE 122",
        "courseType": [
            "NSc"
        ],
        "credits": 4,
        "notes": "Finished course"
    },
    {
        "name": "MATH 126",
        "courseType": [
            "NSc",
            "CS-MATH"
        ],
        "credits": 3,
        "notes": "Finished course"
    },
    {
        "name": "MATH 208",
        "courseType": [
            "CS-MATH"
        ],
        "credits": 3,
        "notes": "Finished course"
    },
    {
        "name": "CSE 123",
        "courseType": [
            "CSE"
        ],
        "credits": 4,
        "notes": "Finished course"
    },
    {
        "name": "CSE 311",
        "courseType": [
            "CSE"
        ],
        "credits": 4,
        "notes": "Finished course"
    },
    {
        "name": "CSE 312",
        "courseType": [
            "CSE"
        ],
        "credits": 4,
        "notes": "Finished course"
    },
    {
        "name": "CSE 331",
        "courseType": [
            "CSE"
        ],
        "credits": 4,
        "notes": "Finished course"
    },
    {
        "name": "CSE 332",
        "courseType": [
            "CSE"
        ],
        "credits": 4,
        "notes": "Finished course"
    },
    {
        "name": "CSE 351",
        "courseType": [
            "CSE",
            "courseTypeNotFound"
        ],
        "credits": 4,
        "notes": "Finished course"
    },
    {
        "name": "CSE 403",
        "courseType": [
            "CSE",
            "courseTypeNotFound"
        ],
        "credits": 4,
        "notes": "Finished course"
    },
    {
        "name": "CSE 341",
        "courseType": [
            "CSE"
        ],
        "credits": 4,
        "notes": "Finished course"
    },
    {
        "name": "CSE 344",
        "courseType": [
            "CSE"
        ],
        "credits": 4,
        "notes": "Finished course"
    },
    {
        "name": "SPAN 110",
        "courseType": [
            "courseTypeNotFound"
        ],
        "credits": 5,
        "notes": "Finished course"
    },
    {
        "name": "CSE 391",
        "courseType": [
            "courseTypeNotFound",
            "courseTypeNotFound"
        ],
        "credits": 0,
        "notes": "Finished course"
    },
    {
        "name": "CSE 190",
        "courseType": [
            "courseTypeNotFound"
        ],
        "credits": 1,
        "notes": "Finished course"
    },
    {
        "name": "ENGL 106",
        "courseType": [
            "courseTypeNotFound"
        ],
        "credits": 10,
        "notes": "Finished course"
    },
    {
        "name": "GEN ST 199",
        "courseType": [
            "courseTypeNotFound"
        ],
        "credits": 2,
        "notes": "Finished course"
    },
    {
        "name": "SOC 376",
        "courseType": [
            "courseTypeNotFound"
        ],
        "credits": 5,
        "notes": "Finished course"
    }
];

let temp_requirements = [
  {
    "name": "CSE 333",
    "courseType": [
      "CSE"
    ],
    "credits": 4,
    "notes": "Temporary sample requirement"
  },
  {
    "name": "CSE 421",
    "courseType": [
      "CSE"
    ],
    "credits": 3,
    "notes": "Temporary sample requirement"
  },
  {
    "name": "CSE 444",
    "courseType": [
      "CSE"
    ],
    "credits": 4,
    "notes": "Temporary sample requirement"
  },
  {
    "name": "CSE 446",
    "courseType": [
      "CSE"
    ],
    "credits": 4,
    "notes": "Temporary sample requirement"
  },
  {
    "name": "CSE 451",
    "courseType": [
      "CSE"
    ],
    "credits": 4,
    "notes": "Temporary sample requirement"
  },
  {
    "name": "CSE 452",
    "courseType": [
      "CSE"
    ],
    "credits": 4,
    "notes": "Temporary sample requirement"
  },
  {
    "name": "CSE 473",
    "courseType": [
      "CSE"
    ],
    "credits": 3,
    "notes": "Temporary sample requirement"
  },
  {
    "name": "CSE 484",
    "courseType": [
      "CSE"
    ],
    "credits": 4,
    "notes": "Temporary sample requirement"
  }
];

/**
 * Opens a schedule tab, adapting class instances before transferring display data.
 * @param {!Array<!Object>} classes Recommended class instances.
 * @param {function(!Object): !Object=} adapter Maps a class to display fields.
 * @return {!Promise<!chrome.tabs.Tab>} The newly opened schedule tab.
 */
export function showSchedule(classes, adapter) {
  const data = encodeURIComponent(JSON.stringify(groupSchedule(classes, adapter)));
  return chrome.tabs.create({
    url: `${chrome.runtime.getURL('schedule.html')}#${data}`,
  });
}

const tabs = [...document.querySelectorAll('[role="tab"]')];

/**
 * Selects a tab and displays its associated panel.
 * @param {!HTMLButtonElement} selectedTab The tab to activate.
 */
function selectTab(selectedTab) {
  for (const tab of tabs) {
    const selected = tab === selectedTab;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
  }
}

for (const tab of tabs) {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (event) => {
    let index = tabs.indexOf(tab);
    switch (event.key) {
      case 'ArrowRight':
        index = (index + 1) % tabs.length;
        break;
      case 'ArrowLeft':
        index = (index - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        index = 0;
        break;
      case 'End':
        index = tabs.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    selectTab(tabs[index]);
    tabs[index].focus();
  });
}

const DARS_URL = 'https://myplan.uw.edu/audit/#/degree';
const generateButton = document.querySelector('#generate-schedule');
const generateHint = document.querySelector('#generate-hint');
const importButton = document.querySelector('#import-dars');
const darsHint = document.querySelector('#dars-hint');
let importing = false;
let generating = false;
// In-memory copy of the DARS result persisted in chrome.storage.local.
let importedDars = null;
const darsReady = restoreDars();

/** Restores the saved audit when the popup opens. */
async function restoreDars() {
  try {
    const saved = await chrome.storage.local.get('importedDars');
    importedDars = saved.importedDars ?? null;
  } catch (error) {
    console.error('Unable to restore saved DARS:', error);
  } finally {
    updateGenerateAvailability();
  }
}

/** Enables generation only when a usable imported audit is available. */
function updateGenerateAvailability() {
  const available = isImportedDars(importedDars);
  generateButton.disabled = !available || importing || generating;
  generateHint.textContent = available ?
      'Your imported degree audit is ready.' :
      'Import your DARS degree audit to generate a schedule.';
}

/** Generates a schedule from the saved audit and opens the populated view. */
async function generateSchedule() {
  await darsReady;
  if (generating || importing || !isImportedDars(importedDars)) {
    return;
  }
  generating = true;
  updateGenerateAvailability();
  generateHint.textContent = 'Generating your schedule...';
  let status;
  try {
    const response = await fetch(chrome.runtime.getURL('uw_cse_courses.json'));
    if (!response.ok) {
      throw new Error('Unable to load the course catalog.');
    }
    const courses = scheduleFromDars(importedDars, await response.json());
    await showSchedule(courses);
    status = 'Your recommended schedule opened in a new tab.';
  } catch (error) {
    console.error('Unable to generate schedule:', error);
    status = 'Unable to generate your schedule. Please try again.';
  } finally {
    generating = false;
    updateGenerateAvailability();
    generateHint.textContent = status;
  }
}

/**
 * Checks whether a URL belongs to the MyPlan audit section.
 * @param {string|undefined} value The tab URL to check.
 * @return {boolean} Whether the URL is an eligible audit page.
 */
function isAuditUrl(value) {
  try {
    const url = new URL(value);
    return url.origin === 'https://myplan.uw.edu' &&
        url.pathname.startsWith('/audit/');
  } catch {
    return false;
  }
}

/**
 * Checks whether the active tab is a MyPlan audit page.
 * @return {!Promise<boolean>} Whether importing is allowed.
 */
async function updateImportAvailability() {
  importButton.disabled = true;
  await darsReady;
  try {
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const allowed = isAuditUrl(activeTab?.url) &&
        (!activeTab.pendingUrl || isAuditUrl(activeTab.pendingUrl));
    importButton.disabled = importing || !allowed;
    darsHint.textContent = allowed ?
        'Ready to import the temporary sample degree audit.' :
        'Open your DARS degree audit to enable Import.';
    return allowed;
  } catch {
    darsHint.textContent = 'Unable to check this page. Reopen AllenPlan on your DARS degree audit.';
    return false;
  }
}

/** Opens the DARS degree audit page in a new tab. */
function openDars() {
  chrome.tabs.create({url: DARS_URL});
}

/** Imports and retains the DARS result after verifying the active page. */
async function importDars() {
  if (importing || !await updateImportAvailability()) {
    return;
  }
  importing = true;
  updateGenerateAvailability();
  importButton.disabled = true;
  document.querySelector('#dars-controls').hidden = true;
  const loading = document.querySelector('#dars-loading');
  loading.hidden = false;
  loading.focus();
  let status;
  try {
    // TODO: Replace the sample input with await retrieveDARS() when ready.
    const result = [temp_finished_classes, temp_requirements];
    await chrome.storage.local.set({importedDars: result});
    importedDars = result;
    status = 'Sample degree audit imported.';
  } catch (error) {
    console.error('Unable to import DARS:', error);
    status = 'Unable to import your degree audit. Please try again.';
  } finally {
    importing = false;
    updateGenerateAvailability();
    loading.hidden = true;
    document.querySelector('#dars-controls').hidden = false;
    await updateImportAvailability();
    darsHint.textContent = status;
  }
}

document.querySelector('#open-dars').addEventListener('click', openDars);
generateButton.addEventListener('click', generateSchedule);
importButton.addEventListener('click', importDars);
chrome.tabs.onUpdated.addListener(() => updateImportAvailability());
chrome.tabs.onActivated.addListener(() => updateImportAvailability());
updateImportAvailability();
