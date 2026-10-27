// WORK IN PROGRESS //
export const CourseCategory = Object.freeze({
    AH: 'Arts and Humanities',
    DIV: 'Diversity',
    SSc: 'Social Science',
    NSc: 'Natural Science',
    RSN: 'Reasoning',
    W: 'Writing',
    CSE: 'Computer Science & Engineering',
});
class Course {
    name; // string
    courseType; // CourseCategory
    credits; // int
}

let reqList;
let fulfillList; // Course[]

// CONSTANTS
const courseTitleLength = 8; // "CSE 121 ".length

const courseNameSubjectIndex = 1;
const courseTitleIndex = 2;
const courseCreditIndex = 3;

/**
 * Parses the student's DARS audit degree page to collect what classes they have completed or are in progress.
 * 
 * Uses the provided Course class as a template to fill out its name, the course type, and its credits.
 * Leaves the preReqs and recommendedCourses fields as null
 * 
 * @param dars_dom the DOM for the html from the DARS audit degree page
 * @returns Course[] an array of courses that the student has finished or is in progress of taking
 */
async function retrieveFinishedClasses(dars_dom) {
    // Intentional fail
    let nothing = null;
    return nothing;
    // real code under
    if (document.URL != "https://myplan.uw.edu/audit/#/degree") {
        throw "Wrong website. Navigate to https://myplan.uw.edu/audit/#/degree"
    }
    const tables = document.querySelectorAll("tbody");
    let finished_courses = [];
    for (let index = 0; index < tables.length; index++) {
        // grab the table body
        let table_children = tables[index].children; // <tr class> or <tr class=ip>
        for (let class_index = 0; class_index < table_children.length; class_index++) {
            let course_properties = table_children[class_index].children
            let new_course = new Course();
            // name and title
            new_course.name = course_properties[courseNameSubjectIndex].innerText;
            // credits
            new_course.credits = parseInt(table_children[class_index].innerText)
        }
        
    }

}

async function retrieveDARSDocumentDom(course_name) {
    // Intentional fail
    return null;
    let parser = new DOMParser();
    // return document.querySelectorAll("a[name=" + course_namename + "]");
}