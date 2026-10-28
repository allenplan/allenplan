import {CourseCategory} from 'darsScraper.js'
import {CourseOffering} from 'classes.js'

export const CourseType = Object.freeze({
    LC: 'Lecture',
    QZ: 'Quiz',
    SM: 'Seminar',
});

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
async function retrieveOfferingsFromList(list) {
    if (list.length === 0) {
        return [];
    }
    let return_list = [];
    // iterate through array
    for (let i = 0; i < list.length; i++) {
        //iterate through course listing
        let new_course_offering = 
            new CourseOffering(list[i][0],
                               list[i][1],
                               list[i][2],
                               list[i][3],
                               list[i][4],
                               list[i][5],
                               list[i][6],
                               list[i][7],
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