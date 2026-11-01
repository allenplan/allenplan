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
 * Reads the document DOM of the DARS audit degree for all the classes that the user has finished and
 * encapsulates in a course Class
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
        if ()
        let course_properties = tables[index].children
        let new_course_array = [course_properties[courseNameIndex].innerText,
                                course_properties[courseDescriptionIndex].innerText,
                                course_properties[courseCreditIndex].innerText];
        finished_courses.push(new_course_array);
    }
    return finished_courses;
}

/**
 * Reads the document DOM of the DARS audit degree for all the degree sections that the user has not finished and
 * encapsulates in a course Class
 * @requires document.URL === "https://myplan.uw.edu/audit/#/degree"
 * @returns A list of Courses that the user has finished or are in progress of finishing.
 * @throws 
 */
function parseDARSDocumentRequirements() {
    if (document.URL !== "https://myplan.uw.edu/audit/#/degree") {
        throw new Error("Wrong website. Navigate to https://myplan.uw.edu/audit/#/degree");
    }
    const results = document.querySelectorAll("div.audit-subrequirement");
    let requirements = [];
    for (let i = 0; i < results.length; i++) {
        if (results[i].offsetParent.classList.contains("Status_NO")) {
            requirements.push(results[i]);
        }
    }
    console.log(requirements);
    CSRequirementsOrganizer(requirements)
}

/**
 * Determines what incomplete requirements per section the user has by reading classes.
 * Needs to be filtered after getting finished classes 
 * @param {*} requirements 
 * @returns list of Courses
 */
function CSRequirementsOrganizer(requirements) {
    let course_list = []
    for (let i = 0; i < requirements.length; i++) {
        const offsetParentClassList = requirements[i].offsetParent.classList;
        if (offsetParentClassList.contains("CSCI-ELEC")) {
            let course_amt;
            let category_num;
            const text = requirements[i].innerText;
            // only works for
            try {
                course_amt = parseInt(text.charAt(text.match("[0-9] course").index));
                category_num = parseInt(text.charAt(text.match("[0-9] (\)").index));
            } catch (error) {
                console.log(error);
                return -1;
            }
            // TODO: make it so that it adds classes on a case by case basis
            switch (category_num) {
                // matches order in DARS of the subrequirements
                case 1:
                  for (let j = 0; j < course_amt; j++) {
                    course_list.push(retrieveFinishedClasses(["CSE 4XX", "CSE", 4]));
                  }
                case 2:
                case 3:
                case 4:
                default:
                    throw new Error("Entered CSIC Core and got a number subcategory that does not exist: " + category_num);

            }
        } else if (offsetParentClassList.contains("CSCICORE")) {
            let course_amt;
            let category_num;
            const text = requirements[i].innerText;
            // only works for
            try {
                category_num = parseInt(text.charAt(text.match("[0-9] (\)").index));
            } catch (error) {
                console.log(error);
                return -1;
            }
            // TODO: make it so that it adds classes on a case by case basis
            // Check in filter if CSE 143 has been completed and change credits
            course_list.push(retrieveFinishedClasses(["CSE 123", "CSE", 4]));
            course_list.push(retrieveFinishedClasses(["CSE 311", "CSE", 4]));
            course_list.push(retrieveFinishedClasses(["CSE 312", "CSE", 4]));
            course_list.push(retrieveFinishedClasses(["CSE 331", "CSE", 4]));
            course_list.push(retrieveFinishedClasses(["CSE 332", "CSE", 4]));
            course_list.push(retrieveFinishedClasses(["CSE 351", "CSE", 4]));
        } else if (offsetParentClassList.contains("CS-MATH")) {
            // Check in filter if MATH 134 and 135 has been completed
            course_list.push(retrieveFinishedClasses(["MATH 124", "NSc", 5]));
            course_list.push(retrieveFinishedClasses(["MATH 125", "NSc", 5]));
            // check if MATH 136 has been completed for both
            course_list.push(retrieveFinishedClasses(["MATH 126", "NSc", 5]));
            course_list.push(retrieveFinishedClasses(["MATH 208", "NSc", 5]));
        } else if (offsetParentClassList.contains("CSCI-NS")) {
            course_list.push(retrieveFinishedClasses(["XXX", "NSc", 5]));
        } else if (offsetParentClassList.contains("A&S&A&HY")) {
            let credits_amt;
            const text = requirements[i].offsetParent.innerText;
            try {
                credits_amt = parseInt((text.match("Needs: [0-9]+ credits")[0]).substring("Needs: ".length));
            } catch (error) {
                console.log(error);
                return -1;
            }
            while (credits_amt > 0) {
                if (credits_amt < 5) {
                    course_list.push(retrieveFinishedClasses(["XXX", "A&H", credits_amt]));
                    credits_amt = 0;
                } else {
                    course_list.push(retrieveFinishedClasses(["XXX", "A&H", 5]));
                    credits_amt -= 5;
                }
                
            }
        } else if (offsetParentClassList.contains("A&SSSCY")) {
            let credits_amt;
            const text = requirements[i].offsetParent.innerText;
            try {
                credits_amt = parseInt((text.match("Needs: [0-9]+ credits")[0]).substring("Needs: ".length));
            } catch (error) {
                console.log(error);
                return -1;
            }
            while (credits_amt > 0) {
                if (credits_amt < 5) {
                    course_list.push(retrieveFinishedClasses(["XXX", "SSc", credits_amt]));
                    credits_amt = 0;
                } else {
                    course_list.push(retrieveFinishedClasses(["XXX", "SSc", 5]));
                    credits_amt -= 5;
                }
                
            }
        } else if (offsetParentClassList.contains("A&SNSCY")) {
            let credits_amt;
            const text = requirements[i].offsetParent.innerText;
            try {
                credits_amt = parseInt((text.match("Needs: [0-9]+ credits")[0]).substring("Needs: ".length));
            } catch (error) {
                console.log(error);
                return -1;
            }
            while (credits_amt > 0) {
                if (credits_amt < 5) {
                    course_list.push(retrieveFinishedClasses(["XXX", "NSc", credits_amt]));
                    credits_amt = 0;
                } else {
                    course_list.push(retrieveFinishedClasses(["XXX", "NSc", 5]));
                    credits_amt -= 5;
                }
                
            }
        } else if (offsetParentClassList.contains("ENGLCOMP")) {
            course_list.push(retrieveFinishedClasses(["XXX", "C", 5]));
        } else if (offsetParentClassList.contains("FORLANG")) {
            
        } else if (offsetParentClassList.contains("RSN")) {
            course_list.push(retrieveFinishedClasses(["XXX", "RSN", 5]));
        } else if (offsetParentClassList.contains("WRITING")) {
            let credits_amt;
            const text = requirements[i].offsetParent.innerText;
            try {
                credits_amt = parseInt((text.match("Needs: [0-9]+ credits")[0]).substring("Needs: ".length));
            } catch (error) {
                console.log(error);
                return -1;
            }
            while (credits_amt > 0) {
                if (credits_amt < 5) {
                    course_list.push(retrieveFinishedClasses(["XXX", "W", credits_amt]));
                    credits_amt = 0;
                } else {
                    course_list.push(retrieveFinishedClasses(["XXX", "W", 5]));
                    credits_amt -= 5;
                }
                
            }
        } else if (offsetParentClassList.contains("DIVERSITY")) {
            course_list.push(retrieveFinishedClasses(["XXX", "DIV", 5]));
        } else {

        }
    }
}

function needCreditsParser() {
    // TODO: clean above code in store the parsing of needed credits in here
}