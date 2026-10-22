
const URL = 'https://courses.cs.washington.edu/courses/cse000/time-sched/teaching2026-2027.html';

async function fetchSchedule() {
    // take in file and setup scraper
    const getURL = await fetch(URL);
    const html = await getURL.text();
    const scan = new DOMParser().parseFromString(html, 'text/html');

    // find all rows and parse data
    const data = [];
    const rows = scan.querySelectorAll('tr');
    for (const row of rows) {
        const cells = row.querySelectorAll('td, th');
        const cellArr = [...cells]; // Converts from nodeList to array
        const text = [];
        for(const cell of cellArr) {
            text.push(cell.textContent.trim()); // remove extra spaces
        }
        data.push(text);
    }
    return data;

}
fetchSchedule().then(data => console.log(data));