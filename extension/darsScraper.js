import {Course} from './classes.js'

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

const courseNameIndex = 1;
const courseDescriptionIndex = 2;
const courseCreditIndex = 3;

/**
 * Parses the student's DARS audit degree page to collect what classes they have completed or are in progress.
 * 
 * Uses the provided Course class as a template to fill out its name, 
 * the course description, and its credits.
 * 
 * 
 * @param list the list for the text from the DARS audit degree page, must be formatted like [name, courseType, credits]
 * @returns Course[] an array of courses that the student has finished or is in progress of taking, empty if an error occurs
 * 
 */
export function retrieveFinishedClasses(list) {
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
                                         list[i][courseDescriptionIndex],
                                         list[i][courseCreditIndex])
        } catch (error) {
            console.log(error);
            return [];
        }
        return_list.push(finished_course);
    }
    return return_list;
    

}
/**
 * Reads the document DOM of the DARS audit degree for all the classes that the user has finished
 * @requires document.URL === "https://myplan.uw.edu/audit/#/degree"
 * @returns A list of Courses that the user has finished or are in progress of finishing.
 */
function parseFinishedCourses() {
    // return document.querySelectorAll("a[name=" + course_namename + "]");
    if (document.URL != "https://myplan.uw.edu/audit/#/degree") {
        throw "Wrong website. Navigate to https://myplan.uw.edu/audit/#/degree"
    }
    const tables = document.querySelectorAll("tr[class]");
    let finished_courses = [];
    for (let index = 0; index < tables.length; index++) {
        let course_properties = tables[index].children
        let new_course_array = [course_properties[courseNameIndex].innerText,
                                course_properties[courseDescriptionIndex].innerText,
                                course_properties[courseCreditIndex].innerText];
        finished_courses.push(new_course_array);
    }
    return finished_courses;
}


function parseMajorRequirements() {
    return -1;
}