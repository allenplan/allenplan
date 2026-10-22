# AllenPlan

AllenPlan is a browser extension that scrapes data from sites like DARS, MyPlan, and the CSE Teaching Schedule to create more informed course plans for students.

By consolidating information from these sources, students will be able to conveniently make course plans with less risk of forgetting to consult a resource and making an unoptimal course plan, while saving time by not needing to rely on a potentially long process to schedule and attend advising appointments.

The Manifest V3 extension uses `manifest.json` and `icon.png`. Its popup,
`popup.html`, has Generate Schedule, Import DARS, and Settings tabs, styled by
`popup.css` using the [UW color palette](https://www.washington.edu/brand/brand-elements/colors/).
`popup.js` handles tab navigation, including arrow keys, Home, and End.
Schedule preferences are placeholders; **Generate schedule** opens `hello.html`
as a preview. **Open DARS page** opens `https://myplan.uw.edu/audit/#/degree`.
**Import** is enabled on any active page under `https://myplan.uw.edu/audit/`,
including nested paths, query parameters, and hash routes; it shows an
"Importing Degree Audit..." loading placeholder without reading or importing data.
Reopen the popup after navigating to DARS. The `activeTab` permission lets the
popup check the current URL when you click the extension icon. Settings contain
placeholder text. Preferences are not saved when the popup closes.

## Run locally

1. Open `chrome://extensions` in Chrome and enable **Developer mode**.
2. Click **Load unpacked** and select this repository directory.
3. Click the AllenPlan extension icon, then **Generate schedule**.
4. Verify that the new tab displays **Hello World**.

Also verify that all three popup tabs switch correctly, checkboxes toggle,
Settings shows all four sections, and **Open DARS page** opens the audit URL.
Verify Import is disabled outside MyPlan's `/audit/` section, enabled on audit
pages (including other audit routes), and shows the loading placeholder when clicked.
The loading placeholder remains until the popup is closed and reopened.

After editing files, reload the extension from `chrome://extensions`.

[Living Document](https://docs.google.com/document/d/1lcMlHKdeGeLQlEwwXSiABRWEiz8iWdu12LJ2YI6Aelk/edit?usp=sharing)
