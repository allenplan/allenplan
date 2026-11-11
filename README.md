# AllenPlan

AllenPlan is a browser extension that scrapes data from sites like DARS, MyPlan, and the CSE Teaching Schedule to create more informed course plans for students.

By consolidating information from these sources, students will be able to conveniently make course plans with less risk of forgetting to consult a resource and making an unoptimal course plan, while saving time by not needing to rely on a potentially long process to schedule and attend advising appointments.

The Manifest V3 extension uses `manifest.json` and `icon.png`. Its popup,
`popup.html`, has Generate Schedule, Import DARS, and Settings tabs, styled by
`popup.css` using the [UW color palette](https://www.washington.edu/brand/brand-elements/colors/).
`popup.js` handles tab navigation, including arrow keys, Home, and End.
The popup opens on Import DARS when no valid audit is saved, or Generate Schedule
when a valid audit is restored from storage.
Use **Settings → Scraping → Delete imported data** to remove the saved audit.
This disables generation until another audit is imported; the next popup opens
on Import DARS. Previously opened schedule tabs keep their displayed results.
Schedule preferences include a maximum of 0–4 CS classes per quarter (default 3)
and a desired-course textbox. Enter course codes separated by commas or new lines,
such as `CSE 421, CSE 451`. Desired courses supplement the audit's goals and obey
prerequisites; completed courses are not repeated. Choosing 0 produces an empty
CS schedule. The third preference remains a placeholder. **Generate schedule** is enabled after a
valid DARS audit is imported or restored from storage. It displays the
recommended schedule in a new browser tab, grouped into Autumn, Winter, and
Spring. On wider screens, the results page places compact generation controls
on the left and the three quarter cards on the right. Requirements needing
attention span the width below both sections. Narrow screens stack the sections
and, on phones, the quarter cards.
The results page also includes the same schedule preferences and Generate schedule
button. It restores the preferences used in the popup, reads the saved audit, and
regenerates in the current tab. Results and preferences survive page refreshes.
Deleting the saved audit disables regeneration until an audit is imported again.
**Open DARS page** opens `https://myplan.uw.edu/audit/#/degree`.
**Import** is enabled on any active page under `https://myplan.uw.edu/audit/`,
including nested paths, query parameters, and hash routes. It runs `retrieveDARS()`
against the active tab's live document through `extension/dars-import.js`, then
saves the finished and required course lists under `importedDars` in
`chrome.storage.local`. Wait for your DARS audit to finish loading before importing.
The `storage` permission allows the audit to survive popup closure and browser
restarts; opening the popup restores it into the `importedDars` variable.
Stored courses retain their data fields, but not class methods.
Click Import again to replace any previously saved sample data with your audit.
Scraper failures appear in the popup and preserve the previously saved audit.
Reopen the popup after navigating to DARS. The `activeTab` permission lets the
popup access the current tab when you click the extension icon. The `scripting`
permission runs the scraper in an isolated content-script context. The manifest
exposes only `darsScraper.js` and its dependency `classes.js` to MyPlan so the
injected function can import them. Settings contain
placeholder text. Preferences are not saved when the popup closes.

`extension/schedule.mjs` connects the audit to `ScheduleCalculator.planQuarters()`.
The audit must be `[finishedCourses, requiredCourses]`, where each course is a
code string or an object with a `name` or `code` field. The scheduling adapter
resolves specific goals and CSE level placeholders such as `CSE 3XX`, `CSE 4XX`,
and `CSE 3XX/4XX`. Each level placeholder is one course slot, including when its
nominal credits differ from the chosen course. Repeated slots require distinct
courses. `XXX` with `courseType: ['CSE']` represents a credit total filled by
upper-division CSE electives; matching credit rows are pooled. Requirements
whose notes link to `#core` use the bundled `uw_cse_core_courses.json` choices.

`extension/requirement-resolver.js` reserves exact goals first, then fills narrow
slots before broader ones and credit totals. It greedily prefers courses needing
fewer additional prerequisites; it does not optimize all possible combinations.
Each course counts toward at most one remaining requirement. Finished courses
satisfy prerequisites and are excluded from new choices because DARS already
reports the remaining requirements. The generator loads the bundled
`uw_cse_courses.json` catalog and plans Autumn, Winter, and Spring with
the selected course limit and at most 18 credits per quarter. Only courses supported by the
calculator's CSE catalog rules can be recommended; offering availability and
meeting-time conflicts are not checked. If no courses qualify, the results page
shows an empty-state explanation. Unsupported categories (such as general
education `XXX` requirements), unfilled slots, and goals beyond the planning
horizon appear under **Requirements needing attention**. The available catalog
does not encode general-education designations or all degree exceptions.
Generation failures show an error in the popup and allow retrying.

The adapter adds catalog titles and credits to the generated course codes.
Normalized display fields and unresolved-requirement messages are transferred
to `extension/schedule.html` through its URL fragment, so
each tab keeps its own schedule when refreshed without extra permissions.
`extension/schedule-page.js` renders course text as text, not HTML.

## Building and running tests
AllenPlan can be run directly from the files in this repository with no additional
build steps. Clone or download this repository and then follow the instructions
in the **Installation** section.

To run the automated test suite,
[install Node.js](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
and run `node --test` from this folder.

## Installation
As a Manifest V3 extension, it is possible to run AllenPlan in several browsers.
Only Chrome is officially supported; Firefox and Safari may work, but may
periodically be broken by new commits.

### Chrome

1. Open `chrome://extensions` in Chrome and enable **Developer mode**.
2. Click **Load unpacked** and select the `extension/` subdirectory of this repository.
3. Click the AllenPlan extension icon. Without a saved audit, verify
   **Generate schedule** is disabled and asks you to import DARS.
4. Open a loaded DARS audit and import it (or seed the development fixture below),
   then click **Generate schedule**. Verify a new browser tab displays
   **Your recommended schedule** with course codes, titles, and credits in the
   Autumn, Winter, and Spring cards.
5. Refresh the results tab and verify the schedule remains visible. Resize the
   window to verify the quarter cards stack on narrow screens.

For a development fixture, run the following in the popup's DevTools console
(this replaces any saved audit), then close and reopen the popup:

```js
await chrome.storage.local.set({
  importedDars: [[{name: 'CSE 121'}], [{name: 'CSE 122'}]],
});
```

Verify CSE 122 appears with its catalog title and four credits, and CSE 121 is
not recommended again. Remove the fixture with
`await chrome.storage.local.remove('importedDars')`, reopen the popup, and verify
generation is disabled again. Automated popup tests use mocked Chrome APIs to
check restoration, import, generation, and catalog failure handling.

Also verify that all three popup tabs switch correctly, checkboxes toggle,
Settings shows all four sections, and **Open DARS page** opens the audit URL.
Verify Import is disabled outside MyPlan's `/audit/` section, enabled on audit
pages (including other audit routes). Verify a successful import displays
"Degree audit imported." and retains the scraped result in `importedDars`.
Close and reopen the popup and verify the saved audit is restored. A failed
import or save should show an error and leave the previous saved audit intact.

After editing files, reload the extension from `chrome://extensions`.

### Safari
Enable developer mode via `Safari > Settings > Advanced > Show features for web developers`.
Then, enter the new `Developer` tab and enable `Allow unsigned extensions`.
Finally, click `Add Temporary Extension` and select the `extensions` subdirectory of this repository.
To update the extension after making changes, go to the Extensions tab, select `AllenPlan` and press `Reload`.

[Living Document](https://docs.google.com/document/d/1lcMlHKdeGeLQlEwwXSiABRWEiz8iWdu12LJ2YI6Aelk/edit?usp=sharing)
