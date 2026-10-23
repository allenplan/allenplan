/** Renders the normalized schedule passed by the popup in the URL fragment. */
function renderSchedule() {
  let groups;
  try {
    groups = JSON.parse(decodeURIComponent(window.location.hash.slice(1)));
    if (!Array.isArray(groups)) {
      throw new Error('Invalid schedule');
    }
  } catch {
    document.querySelector('#schedule-status').textContent =
        'Unable to load this schedule. Generate a new schedule from AllenPlan.';
    return;
  }
  const container = document.querySelector('#schedule-quarters');
  container.replaceChildren();
  for (const {quarter, courses} of groups) {
    const section = document.createElement('section');
    section.className = 'card quarter';
    const heading = document.createElement('h3');
    heading.textContent = quarter;
    section.append(heading);
    if (courses.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'No courses recommended yet.';
      section.append(empty);
    } else {
      const list = document.createElement('ul');
      for (const course of courses) {
        const item = document.createElement('li');
        const name = document.createElement('strong');
        name.textContent = [course.code, course.title].filter(Boolean).join(' — ') ||
            'Untitled course';
        item.append(name);
        if (course.credits !== '') {
          const credits = document.createElement('small');
          credits.textContent = `${course.credits} credits`;
          item.append(credits);
        }
        list.append(item);
      }
      section.append(list);
    }
    container.append(section);
  }
}

renderSchedule();
