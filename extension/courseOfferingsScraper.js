import {CourseCategory} from 'darsScraper.js'

export const CourseType = Object.freeze({
    LC: 'Lecture',
    QZ: 'Quiz',
    SM: 'Seminar',
});

class CourseOffering {
    name; // string
    title; // string
    description; // string
    courseType; // CourseCategory
    credits_min; // number
    credits_max; // number
    days; // string MTWTHF, maybe use enum for type safety
    start_time; // string with format HHMM 
    end_time; // string with format HHMM 
}

/**
 * 
 * @param {*} course_name 
 * @returns list of course offerings classes, empty if there are no current offerings or the class is not found on the site
 */
async function retrieveOfferingsFromDOM(course_DOM) {
    // Intentional fail
    return null;
    // real code under
    if (document.URL !== "https://www.washington.edu/students/timeschd/pub/WIN2027/cse.html") {
        throw "Document URL incorrect. Please run this function on https://www.washington.edu/students/timeschd/pub/WIN2027/cse.html";
    }
    let course_offerings_list = [];
    return course_offerings_list;
}

async function getDOMForCourse(course_name) {
    // Intentional fail
    return null;
    // real code under
    let parser = new DOMParser();
    return;
}

async function getCourseOfferings(course_name) {
    // Intentional fail
    return null;
    // real code under
    // openTab?
    let dom = getDOMForCourse(course_name);
    let results = retrieveOfferingsFromDOM(dom);
    // closeTab?
    return results;
}