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
const courseTypeIndex = 2;
const courseCreditIndex = 3;
const courseCCodeIndex = 5;

function getFinishedCourses() {
    const dom_list = parseFinishedCourses();
    const course_list = retrieveFinishedClasses(dom_list);
    return course_list;
}

function getRequiredCourses() {
    const dom_list = parseDARSDocumentRequirements();
    return CSRequirementsOrganizer(dom_list);
}
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
    let return_list = [];
    for (let i = 0; i < list.length; i++) {
        let dup = false;
        if (list[i].length !== 3) {
            throw new Error("Invalid size of array for finished course." +
                            "Size was: " + list[i].length + "for index " + i);
        }
        let finished_course;
        // check if duplicate course was found (splitting credits)
        for (let course in return_list) {
            if (course.name === list[i][courseNameIndex]) {
                course.courseType.push(list[i][courseTypeIndex]);
                dup = true;
            }
        }
        if (!dup) {
            try {
                finished_course = new Course(list[i][courseNameIndex],
                                                [list[i][courseTypeIndex]],
                                                list[i][courseCreditIndex])
            } catch (error) {
                console.log(error);
                return [];
            }
            return_list.push(finished_course);
        }
    }
    return return_list;
    

}
/**
 * Reads the document DOM of the DARS audit degree for all the classes that the user has finished and
 * encapsulates in a course Class
 * @requires document.URL === "https://myplan.uw.edu/audit/#/degree"
 * @returns A list of Courses that the user has finished or are in progress of finishing.
 */
async function parseFinishedCourses() {
    // return document.querySelectorAll("a[name=" + course_namename + "]");
    if (!document.URL.includes("https://myplan.uw.edu/audit/#/degree")) {
        throw "Wrong website. Navigate to https://myplan.uw.edu/audit/#/degree"
    }
    const tables = document.querySelectorAll("tr[class]");
    let finished_courses = [];
    for (let index = 0; index < tables.length; index++) {
        let course_properties = tables[index].children
        const requirement_div = tables[index].offsetParent.offsetParent.offsetParent;
        const courseType = searchCourseType(requirement_div);
        if (courseType === -1) {
            throw new Error("courseType was not found for the class list: " + requirement_div.classList);
        }
        switch (course_properties[courseCCodeIndex].innerText) {
            case ">D":
                continue;
            default:
        }
        let new_course_array = [course_properties[courseNameIndex].innerText,
                                courseType,
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
async function parseDARSDocumentRequirements() {
    if (!document.URL.includes("https://myplan.uw.edu/audit/#/degree")) {
        throw new Error("Wrong website. Navigate to https://myplan.uw.edu/audit/#/degree");
    }
    const results = document.querySelectorAll("div.audit-subrequirement");
    let requirements = [];
    for (let i = 0; i < results.length; i++) {
        if (results[i].offsetParent.classList.contains("Status_NO")) {
            requirements.push(results[i]);
        }
    }
    return requirements;
}

/**
 * Determines what incomplete requirements per section the user has by reading classes.
 * Requires that the Node API is available to use.
 * @param {!Array<!Object} requirements A list of arrays that contains the course name, the type, and its credits
 * @returns list of Courses or placeholder courses that the user needs to take
 */
function CSRequirementsOrganizer(requirements) {
    let course_list = [];
    for (let i = 0; i < requirements.length; i++) {
        const offsetParentClassList = requirements[i].offsetParent.classList;
        if (offsetParentClassList.contains("CSCI-ELEC")) {
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
            console.log(category_num);
            const temp = text.match("[0-9] (\)");
            if (temp === null) {
                course_amt = 0;
            } else {
                try {
                    course_amt = parseInt(text.charAt(temp.index));
                } catch (error) {
                    console.log(error);
                    return -1;
                }
            }
            // TODO: make it so that it adds classes on a case by case basis
            switch (category_num) {
                // matches order in DARS of the subrequirements
                case 1:
                  for (let j = 0; j < course_amt; j++) {
                    course_list.push(["CSE 4XX", "CSE", 4]);
                  }
                  break;
                case 2:
                    for (let j = 0; j < course_amt; j++) {
                        course_list.push(["CSE 3XX/4XX", "CSE", 4]);
                    }
                    break;
                case 3:
                    course_list.push(["CSE 3XX/4XX", "CSE", 4]);
                    break;
                case 4: // electives list, will need adjustment to be accurate with credit count. assuming 4 credit
                    course_list.push(["XXX", "CSE", 4]);
                    break;
                default:
                    throw new Error("Entered CSIC ELEC and got a number subcategory that does not exist: " + category_num);
            }
        } else if (offsetParentClassList.contains("CSCICORE")) {
            let category_num;
            const text = requirements[i].innerText;
            try {
                category_num = parseInt(text.charAt(text.match("[0-9] (\)").index));
            } catch (error) {
                console.log(error);
                return -1;
            }
            switch (category_num) {
                case 1:
                    // check for CSE 143 while clearing this
                    course_list.push(["CSE 123", "CSE", 4]);
                    break;
                case 2:
                    course_list.push(["CSE 311", "CSE", 4]);
                    course_list.push(["CSE 312", "CSE", 4]);
                    break;
                case 3:
                    course_list.push(["CSE 331", "CSE", 4]);
                    course_list.push(["CSE 332", "CSE", 4]);
                    break;
                case 4:
                    course_list.push(["CSE 351", "CSE", 4]);
                    break;
                default:
                    throw new Error("Entered CSIC Core and got a number subcategory that does not exist: " + category_num);
                }
            // TODO: make it so that it adds classes on a case by case basis
            // Check in filter if CSE 143 has been completed and change credits
            
        } else if (offsetParentClassList.contains("CS-MATH")) {
            // Check in filter if MATH 134 and 135 has been completed
            course_list.push(["MATH 124", "NSc", 5]);
            course_list.push(["MATH 125", "NSc", 5]);
            // check if MATH 136 has been completed for both
            course_list.push(["MATH 126", "NSc", 5]);
            course_list.push(["MATH 208", "NSc", 5]);
        } else if (offsetParentClassList.contains("CSCI-NS")) {
            course_list.push(["XXX", "NSc", 5]);
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
                    course_list.push(["XXX", "A&H", credits_amt]);
                    credits_amt = 0;
                } else {
                    course_list.push(["XXX", "A&H", 5]);
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
                    course_list.push(["XXX", "SSc", credits_amt]);
                    credits_amt = 0;
                } else {
                    course_list.push(["XXX", "SSc", 5]);
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
                    course_list.push(["XXX", "NSc", credits_amt]);
                    credits_amt = 0;
                } else {
                    course_list.push(["XXX", "NSc", 5]);
                    credits_amt -= 5;
                }
                
            }
        } else if (offsetParentClassList.contains("ENGLCOMP")) {
            course_list.push(["XXX", "C", 5]);
        } else if (offsetParentClassList.contains("FORLANG")) {
            if (course_list.some(subArray => subArray.includes("FORLANG"))) {
                continue;
            } else {
                course_list.push(["XXX", "FORLANG", 15]);
            }
        } else if (offsetParentClassList.contains("RSN")) {
            course_list.push(["XXX", "RSN", 5]);
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
                    course_list.push(["XXX", "W", credits_amt]);
                    credits_amt = 0;
                } else {
                    course_list.push(["XXX", "W", 5]);
                    credits_amt -= 5;
                }
                
            }
        } else if (offsetParentClassList.contains("DIVERSITY")) {
            course_list.push(["XXX", "DIV", 5]);
        } else {
            return -1;
        }
    }
    return course_list;
}

function needCreditsParser() {
    // TODO: clean above code in store the parsing of needed credits in here
}

function searchCourseType(course_div) {
    if (course_div.contains("CSCICORE") || course_div.contains("CSCI-ELEC")) {
        return "CSE";
    } else if (course_div.contains("CS-MATH")) {
        return "NSc";
    } else if (course_div.contains("CSCI-NS")) {
        return "NSc";
    } else if (course_div.contains("A&S&A&HY")) {
        return "A&H"
    } else if (course_div.contains("A&SSSCY")) {
        return "SSc";
    } else if (course_div.contains("A&SNSCY")) {
        return "NSc";
    } else if (course_div.contains("ENGLCOMP")) {
        return "C";
    } else if (course_div.contains("FORLANG")) {
        return "FORLANG";
    } else if (course_div.contains("RSN")) {
        return "RSN";
    } else if (course_div.contains("WRITING")) {
        return "WRITING";
    } else if (course_div.contains("DIVERSITY")) {
        return "DIV";
    } else {
        return -1;
    }
}