import {CourseOffering} from './classes.js'

export const CourseType = Object.freeze({
    LC: 'Lecture',
    QZ: 'Quiz',
    SM: 'Seminar',
});

// CONSTANTS
const courseOfferingName = 0;
const courseOfferingTitle = 1;
const courseOfferingDescription = 2;
const courseOfferingType = 3;
const courseOfferingMinMax = 4;
const courseOfferingDays = 5;
const courseOfferingStartEnd = 6;
/**
 * @requires list each array has to have their text ordered like "name, title, description, 
 *                courseType, credits_range, days, time_range" for its indices.
 * @param {string[][]} list A 2-D list of strings where each array contains the text/html 
 *                          for one course offering. The ordering of the elements in each 
 *                          array matters to match the defined constructor for CourseOffering
 *                              
 *                          
 * @returns A list of CourseOfferings, 
 *          empty if there are no current offerings or the class is not found on the site
 */
export function retrieveOfferingsFromList(list) {
    if (list.length === 0) {
        return [];
    }
    let return_list = [];
    // iterate through array
    for (let i = 0; i < list.length; i++) {
        //iterate through course listing
        if (list[i].length !== 7) {
            throw new Error("Invalid size of array for finished course." +
                            "Size was: " + list[i].length + " for index " + i);
        }
        let new_course_offering = 
            new CourseOffering(list[i][courseOfferingName],
                               list[i][courseOfferingTitle],
                               list[i][courseOfferingDescription],
                               list[i][courseOfferingType],
                               list[i][courseOfferingMinMax],
                               list[i][courseOfferingDays],
                               list[i][courseOfferingStartEnd],
            );
        return_list.push(new_course_offering);
    }
    return return_list;
}

/**
 * All the functions that need the Node API that is provided by 
 * the browser will be executed in this function.
 * 
 * @param {*} course_name 
 * @returns 
 */
async function getDOMForCourse(course_name) {
    // Intentional fail
    return null;
    // real code under
    let parser;
    return;
}

/**
 * 
 * @returns a list of lists where each inner list contains the course offerings for a specific course
 */
async function getCourseOfferings() {
    // Intentional fail
    return null;
    // real code under
    // openTab?
    let dom = getDOMForCourse();
    let results = retrieveOfferingsFromDOM(dom);
    // closeTab?
    return results;
}