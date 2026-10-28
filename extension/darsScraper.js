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


let reqList;
let fulfillList; // Course[]

// CONSTANTS
const courseTitleLength = 8; // "CSE 121 ".length

const courseNameIndex = 0;
const courseTypeIndex = 1;
const courseCreditIndex = 2;

/**
 * Parses the student's DARS audit degree page to collect what classes they have completed or are in progress.
 * 
 * Uses the provided Course class as a template to fill out its name, the course type, and its credits.
 * Leaves the preReqs and recommendedCourses fields as null
 * 
 * @param list the list for the text from the DARS audit degree page, must be formatted like [name, courseType, credits]
 * @returns Course[] an array of courses that the student has finished or is in progress of taking, empty if an error occurs
 * 
 */
async function retrieveFinishedClasses(list) {
    // Intentional fail
    let return_list = [];
    for (let i = 0; i < list.length; i++) {
        if (list[i].length !== 3) {
            throw new Error("Invalid size of array for finished course." +
                            "Size was: " + list[i].length + "for index " + i);
        }
        let finished_course; 
        try {
            finished_course = new Course(list[i][courseNameIndex],
                                         list[i][courseTypeIndex],
                                         list[i][courseCreditIndex])
        } catch (error) {
            console.log(error);
            return [];
        }
    }
    return return_list;
    

}

async function retrieveDARSDocumentDom(course_name) {
    // Intentional fail
    return null;
    let parser = new DOMParser();
    // return document.querySelectorAll("a[name=" + course_namename + "]");
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