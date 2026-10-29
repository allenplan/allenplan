# AllenPlan

AllenPlan is a browser extension that scrapes data from sites like DARS, MyPlan, and the CSE Teaching Schedule to create more informed course plans for students.

By consolidating information from these sources, students will be able to conveniently make course plans with less risk of forgetting to consult a resource and making an unoptimal course plan, while saving time by not needing to rely on a potentially long process to schedule and attend advising appointments.

The Manifest V3 extension uses `manifest.json` and `icon.png`. Its popup,
`popup.html`, has Generate Schedule, Import DARS, and Settings tabs, styled by
`popup.css` using the [UW color palette](https://www.washington.edu/brand/brand-elements/colors/).
`popup.js` handles tab navigation, including arrow keys, Home, and End.
Schedule preferences are placeholders; **Generate schedule** displays the
recommended schedule in a new browser tab, grouped into Autumn, Winter, and
Spring. The results page uses three columns on wider screens and stacks quarters
on narrow screens.
**Open DARS page** opens `https://myplan.uw.edu/audit/#/degree`.
**Import** is enabled on any active page under `https://myplan.uw.edu/audit/`,
including nested paths, query parameters, and hash routes; it shows an
"Importing Degree Audit..." loading placeholder without reading or importing data.
Reopen the popup after navigating to DARS. The `activeTab` permission lets the
popup check the current URL when you click the extension icon. Settings contain
placeholder text. Preferences are not saved when the popup closes.

The generator is not connected yet, so the schedule initially shows empty
quarters. To integrate it, replace `showSchedule([])` in `extension/popup.js`
with `showSchedule(classes)` using the generator's array of class instances.
`extension/schedule.mjs` isolates the provisional mapping of `quarter`, `code`,
`title` (or `name`), and optional `credits`. Alternatively, pass
`showSchedule(classes, course => ({quarter: ..., code: ..., title: ...,
credits: ...}))` to adapt any future class API, including methods. Quarter names
are case insensitive and trimmed. Courses with missing or unrecognized quarters
appear under **Quarter to be assigned** until the generator supplies a quarter.
Input instances are neither serialized nor modified. Only normalized display
fields are transferred to `extension/schedule.html` through its URL fragment, so
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
3. Click the AllenPlan extension icon, then **Generate schedule**.
4. Verify a new browser tab displays **Your recommended schedule** and the
   Autumn, Winter, and Spring cards with empty-state messages.
5. Refresh the results tab and verify the schedule remains visible. Resize the
   window to verify the quarter cards stack on narrow screens.

For populated results, temporarily supply an array to `showSchedule` in the
button handler, such as `[{quarter: 'Autumn', code: 'CSE 332',
title: 'Data Structures', credits: 4}]`. Verify the course appears in Autumn,
the other quarters remain visible, and missing quarters appear in the
unassigned section. Restore the empty input after checking.

Also verify that all three popup tabs switch correctly, checkboxes toggle,
Settings shows all four sections, and **Open DARS page** opens the audit URL.
Verify Import is disabled outside MyPlan's `/audit/` section, enabled on audit
pages (including other audit routes), and shows the loading placeholder when clicked.
The loading placeholder remains until the popup is closed and reopened.

After editing files, reload the extension from `chrome://extensions`.

### Safari
Enable developer mode via `Safari > Settings > Advanced > Show features for web developers`.
Then, enter the new `Developer` tab and enable `Allow unsigned extensions`.
Finally, click `Add Temporary Extension` and select the `extensions` subdirectory of this repository.
To update the extension after making changes, go to the Extensions tab, select `AllenPlan` and press `Reload`.

[Living Document](https://docs.google.com/document/d/1lcMlHKdeGeLQlEwwXSiABRWEiz8iWdu12LJ2YI6Aelk/edit?usp=sharing)

### Week of 10/19
Found sites to webscrape class and quarter data from, planned best way to store data keeping privacy a top concern
Ran into some setbacks on sites we originally though we could webscrape from not working
Desgined some of the UI of how data will be displayed to the user in our MVP

### Week of 10/26
Planned how the JavaScript classes and functions should interact with each other
