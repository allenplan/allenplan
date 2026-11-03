/** Renders the normalized schedule passed by the popup in the URL fragment. */
function renderSchedule() {
  let groups;
  let warnings;
  try {
    const data = JSON.parse(decodeURIComponent(window.location.hash.slice(1)));
    // Continue to support schedule tabs opened before warnings were introduced.
    groups = Array.isArray(data) ? data : data.groups;
    warnings = Array.isArray(data) ? [] : data.warnings ?? [];
    if (!Array.isArray(groups) || !Array.isArray(warnings) ||
        !warnings.every((warning) => typeof warning === 'string')) {
      throw new Error('Invalid schedule');
    }
  } catch {
    document.querySelector('#schedule-status').textContent =
        'Unable to load this schedule. Generate a new schedule from AllenPlan.';
    return;
  }
  const container = document.querySelector('#schedule-quarters');
  const notice = document.querySelector('#schedule-warnings');
  notice.replaceChildren();
  notice.hidden = warnings.length === 0;
  if (warnings.length) {
    const heading = document.createElement('h3');
    heading.textContent = 'Requirements needing attention';
    const list = document.createElement('ul');
    for (const warning of warnings) {
      const item = document.createElement('li');
      item.textContent = warning;
      list.append(item);
    }
    notice.append(heading, list);
  }
  const courseCount = groups.reduce((total, group) => total + group.courses.length, 0);
  document.querySelector('#schedule-status').textContent = courseCount ?
      `${courseCount} course${courseCount === 1 ? '' : 's'} recommended from your degree audit.` :
      'No eligible courses found for your remaining requirements in the supported catalog.';
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
