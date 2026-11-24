import {Course} from './classes.js'
// import * as filter from './scraper_scripts/degreeFilters.js'
// import * as organizer from './scraper_scripts/degreeOrganizers.js'

// CONSTANTS

const courseNameIndex = 1;
const courseTypeIndex = 2;
const courseCreditIndex = 3;
const courseCCodeIndex = 5;

// DEFENSIVE BOOLEANS

const checkWebsite = false;

/**
 * Parses the user's DARs audit degree and returns a list of completed or in-progress courses
 * Encapsulates these classes in a Course class that has defines its name, courseType, credits, and notes about
 * the class.
 * @returns A list of Course classes that the user has completed or currently have taken
 */
export function getFinishedCourses(major_name) {
    const dom_list = parseFinishedCourses(major_name);
    const course_list = retrieveFinishedClasses(dom_list);
    return course_list;
}
/**
 * Parses the user's DARs audit degree and returns a list of requirements that the user needs to complete for the intended degree.
 * Encapsulates these classes in a Course class and may define the name as placeholders that the user can willingly choose (read Course class)
 * Is coupled along with getFinishedCourses to fix limitations from general parsing HTML.
 * @requires getFinishedCourses to give an accurate listing of finished courses with their name and courseType.
 * @returns A list of Course classes that the user has completed or currently have taken
 */
export function getRequiredCourses(major_name, finished_courses) {
    const dom_list = parseDARSDocumentRequirements();
    console.log(dom_list);
    const requirement_list = returnRequiredOrganizer(major_name, dom_list); //CERequirementsOrganizer(dom_list);
    console.log(requirement_list);
    const required_course_list = retrieveRequiredClasses(requirement_list);
    console.log(finished_courses);
    console.log(required_course_list);
    const new_requirements = returnFilter(major_name, finished_courses, required_course_list);
    // filterRequirements_CE(finished_courses, required_course_list);
    console.log(new_requirements);
    return new_requirements;
}
/**
 * Parses the student's DARS audit degree page to collect what classes they have completed or are in progress.
 * 
 * Uses the provided Course class as a template to fill out its name, 
 * the course description, and its credits.
 * 
 * @param list the list for the text from the DARS audit degree page, must be formatted like [name, courseType, credits]
 * @returns Course[] an array of courses that the student has finished or is in progress of taking, empty if an error occurs
 * 
 */
export function retrieveFinishedClasses(list) {
    let return_list = [];
    for (let i = 0; i < list.length; i++) {
        //console.log(list[i][courseNameIndex - 1],list[i][courseTypeIndex - 1],list[i][courseCreditIndex - 1]);
        let duplicate = false;
        if (list[i].length !== 3) {
            throw new Error("Invalid size of array for finished course." +
                            "Size was: " + list[i].length + "for index " + i);
        }
        let finished_course;
        // check if duplicate course was found (splitting credits)
        return_list.forEach((course) => {
            if (course.name == list[i][courseNameIndex - 1]) {
                course.courseType.push(list[i][courseTypeIndex - 1]);
                duplicate = true;
            }
        });
        if (!duplicate) {
            try {
                finished_course = new Course(list[i][courseNameIndex - 1],
                                                [list[i][courseTypeIndex - 1]],
                                                list[i][courseCreditIndex - 1],
                                                "Finished course");
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
 * @throws Error When the website is not the UW degree audit page
 */
export function parseFinishedCourses(major_name) {
    if (checkWebsite) {
        if (!document.URL.includes("https://myplan.uw.edu/audit/")) {
            throw new Error("Wrong website. Navigate to https://myplan.uw.edu/audit/#/degree : " + document.URL);
        }
        if (!document.getElementsByClassName("page-heading")[0].innerText.includes("DARS")) {
            throw new Error("Wrong website. Navigate to https://myplan.uw.edu/audit/#/degree : " + document.URL);
        }
    }
    const tables = document.querySelectorAll("tr[class]");
    let finished_courses = [];
    for (let index = 0; index < tables.length; index++) {
        let course_properties = tables[index].children
        const requirement_div_class_list = tables[index].offsetParent.offsetParent.offsetParent.classList;
        const courseType = returnCourseType(major_name, requirement_div_class_list);
        if (courseType === -1) {
            throw new Error("courseType was not found for the class list: " + requirement_div.classList);
        }
        switch (course_properties[courseCCodeIndex].innerText) {
            case ">D": // dropped courses
                continue;
            case ">S": // full course used elsewhere
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
 * Encapsulates requirements into Course class.
 * 
 * @param {*} list a 2-d list of strings and an array that hold the fields to the Course class
 * @requires list has the strings ordered as [name, [courseType], index, notes] in the inner array
 * @returns list of Course classes that indicate what type of courses the user should be taking
 */
export function retrieveRequiredClasses(list) {
    let return_list = [];
    for (let i = 0; i < list.length; i++) {
        //console.log(list[i][courseNameIndex - 1],list[i][courseTypeIndex - 1], list[i][courseCreditIndex - 1],list[i][3]);
        if (list[i].length !== 4) {
            throw new Error("Invalid size of array for finished course." +
                            "Size was: " + list[i].length + "for index " + i);
        }
        let finished_course;
        try {
            finished_course = new Course(list[i][courseNameIndex - 1],
                                         [list[i][courseTypeIndex - 1]],
                                         list[i][courseCreditIndex - 1],
                                         list[i][3]);
        } catch (error) {
            console.log(error);
            return [];
        }
        return_list.push(finished_course);
    }
    return return_list;
}
/**
 * Reads the document DOM of the DARS audit degree for all the degree sections that the user has not finished and
 * encapsulates in a course Class
 * @requires document.URL === "https://myplan.uw.edu/audit/#/degree"
 * @returns A list of divs that the user has finished or are in progress of finishing.
 * @throws When the website is not the UW degree audit page
 */
export function parseDARSDocumentRequirements() {
    if (checkWebsite) {
        if (!document.URL.includes("https://myplan.uw.edu/audit/")) {
            throw new Error("Wrong website. Navigate to https://myplan.uw.edu/audit/#/degree : " + document.URL);
        }
        if (!document.getElementsByClassName("page-heading")[0].innerText.includes("DARS")) {
            throw new Error("Wrong website. Navigate to https://myplan.uw.edu/audit/#/degree : " + document.URL);
        }
    }
    let results = document.querySelectorAll("div.audit-subrequirement");
    let requirements = [];
    for (let i = 0; i < results.length; i++) {
        const status_div_classes = results[i].children[0].classList;
        if (results[i].offsetParent.classList.contains("Status_NO") && !status_div_classes.contains("Status_OK") && !status_div_classes.contains("Status_IP") && !status_div_classes.contains("Status_NONE")) {
            requirements.push(results[i]);
        }
    }
    // temporary fix for CSCI-NSC, refactor to fix this for CSE
    let temp = document.querySelector("div.CSCI-NS");
    if (temp !== null) {
        const status_div_classes = temp.children[0].classList;
        if (temp.classList.contains("Status_NO") && !status_div_classes.contains("Status_OK") && !status_div_classes.contains("Status_IP")) {
                requirements.push(temp);
        }
    }
    temp = document.querySelector("div.CE-SCI-EL");
    if (temp !== null) {
        const status_div_classes = temp.children[0].classList;
        if (temp.classList.contains("Status_NO") && !status_div_classes.contains("Status_OK") && !status_div_classes.contains("Status_IP")) {
                requirements.push(temp);
        }
    }
    return requirements;
}

/**
 * Determines what incomplete requirements per section the user has by reading classes.
 * Requires that the Node API is available to use from the browser
 * @param {!Array<!Object>} requirements A list of arrays that contains the course name, the type, and its credits
 * @requires requirements has to have each div have an offsetParent whose classList is a requirement by a degree
 * @returns list of Courses or placeholder courses that the user needs to take
 */
export function CSRequirementsOrganizer(requirements) {
    let course_list = [];
    for (let i = 0; i < requirements.length; i++) {
        const offsetParentClassList = requirements[i].offsetParent.classList;
        const text = requirements[i].innerText;
        const category_num = getCategoryNum(text);
        const credits_amt = getCreditsAmt(text);
        const course_amt = getCourseAmt(text);
        if (offsetParentClassList.contains("CSCIELEC") || offsetParentClassList.contains("CSCI-ELEC")) {
            // TODO: make it so that it adds classes on a case by case basis
            console.log("HERE HERE ", category_num);
            switch (category_num) {
                // matches order in DARS of the subrequirements
                case 1:
                  for (let j = 0; j < course_amt; j++) {
                    course_list.push(["CSE 4XX", "CSE", 4, "https://www.cs.washington.edu/academics/undergraduate/degree-requirements/courses/#core"]);
                  }
                  break;
                case 2:
                    for (let j = 0; j < course_amt; j++) {
                        course_list.push(["CSE 3XX/4XX", "CSE", 4, "https://www.cs.washington.edu/academics/undergraduate/degree-requirements/courses/#core"]);
                    }
                    break;
                case 3:
                    course_list.push(["CSE 3XX/4XX", "CSE", 4, "https://www.cs.washington.edu/academics/undergraduate/degree-requirements/courses/#core"]);
                    break;
                case 4: // TODO: electives list, will need adjustment to be accurate with credit count. assuming 4 credit
                    //course_list.push(["XXX", "CSE", 5, "https://www.cs.washington.edu/academics/undergraduate/degree-requirements/courses/#electives"]);
                    break;
                default:
                    console.log(offsetParentClassList, category_num);
                    break;
                    // throw new Error("Entered CSIC Core and got a number subcategory that does not exist: " + category_num);
            }
        } else if (offsetParentClassList.contains("CSCICORE")) {
            switch (category_num) {
                case 1:
                    // check for CSE 143 while clearing this
                    course_list.push(["CSE 123", "CSE", 4, "required"]);
                    break;
                case 2:
                    course_list.push(["CSE 311", "CSE", 4, "required"]);
                    course_list.push(["CSE 312", "CSE", 4, "required"]);
                    break;
                case 3:
                    course_list.push(["CSE 331", "CSE", 4, "required"]);
                    course_list.push(["CSE 332", "CSE", 4, "required"]);
                    break;
                case 4:
                    course_list.push(["CSE 351", "CSE", 4, "required"]);
                    break;
                default:
                    console.log(offsetParentClassList, category_num);
                    break;
                    // throw new Error("Entered CSIC Core and got a number subcategory that does not exist: " + category_num);
                }
            
        } else if (offsetParentClassList.contains("CS-MATH") && requirements[i].innerText.match("OR (\)") === null) {
            // Check in filter if MATH 134 and 135 has been completed
            course_list.push(["MATH 124", "CS-MATH", 5, "alternative: MATH 134"]);
            course_list.push(["MATH 125", "CS-MATH", 5, "alternative: MATH 135"]);
            // check if MATH 136 has been completed for both
            course_list.push(["MATH 126", "CS-MATH", 5, "alternative: MATH 136"]);
            course_list.push(["MATH 208", "CS-MATH", 3, "alternative: MATH 136"]);
        } else if (requirements[i].classList.contains("CSCI-NS")) {
            course_list.push(["XXX", "CS-NSc", 5, "https://www.cs.washington.edu/academics/undergraduate/degree-requirements/courses/#cs-natural-science"]);
        }
    }
    return course_list;
}

export function ArtsAndSciencesOrganizer(requirements) {
    let course_list = [];
    for (let i = 0; i < requirements.length; i++) {
        const offsetParentClassList = requirements[i].offsetParent.classList;
        if (offsetParentClassList.contains("A&SA&HY")) {
            const text = requirements[i].offsetParent.innerText;
            const credits_amt = getCreditsAmt(text);
            while (credits_amt > 0) {
                if (credits_amt < 5) {
                    course_list.push(["XXX", "A&H", credits_amt, "required"]);
                    credits_amt = 0;
                } else {
                    course_list.push(["XXX", "A&H", 5, "required"]);
                    credits_amt -= 5;
                }
                
            }
        } else if (offsetParentClassList.contains("A&SSSCY")) {
            const text = requirements[i].offsetParent.innerText;
            const credits_amt = getCreditsAmt(text);
            while (credits_amt > 0) {
                if (credits_amt < 5) {
                    course_list.push(["XXX", "SSc", credits_amt, "required"]);
                    credits_amt = 0;
                } else {
                    course_list.push(["XXX", "SSc", 5, "required"]);
                    credits_amt -= 5;
                }
                
            }
        } else if (offsetParentClassList.contains("A&SNSCY")) {
            const text = requirements[i].offsetParent.innerText;
            const credits_amt = getCreditsAmt(text);
            while (credits_amt > 0) {
                if (credits_amt < 5) {
                    course_list.push(["XXX", "NSc", credits_amt, "required"]);
                    credits_amt = 0;
                } else {
                    course_list.push(["XXX", "NSc", 5, "required"]);
                    credits_amt -= 5;
                }
                
            }
        } else if (offsetParentClassList.contains("ENGLCOMP")) {
            course_list.push(["XXX", "C", 5, "required"]);
        } else if (offsetParentClassList.contains("FORLANG")) {
            if (course_list.some(subArray => subArray.includes("FORLANG"))) {
                continue;
            } else {
                course_list.push(["XXX", "FORLANG", 15,"https://advising.uw.edu/degree-overview/general-education/foreign-language/"]);
            }
        } else if (offsetParentClassList.contains("RSN")) {
            course_list.push(["XXX", "RSN", 5, "required"]);
        } else if (offsetParentClassList.contains("WRITING")) {
            const text = requirements[i].offsetParent.innerText;
            const credits_amt = getCreditsAmt(text);
            while (credits_amt > 0) {
                if (credits_amt < 5) {
                    course_list.push(["XXX", "W", credits_amt, "required"]);
                    credits_amt = 0;
                } else {
                    course_list.push(["XXX", "W", 5, "required"]);
                    credits_amt -= 5;
                }
                
            }
        } else if (offsetParentClassList.contains("DIVERSITY")) {
            course_list.push(["XXX", "DIV", 5, "required"]);
        } else {
            console.log("Else: ", requirements[i]);
            console.log(offsetParentClassList);
            continue;
        }
    }
    // Areas of Inquiry, minimum 75 calculation, still broken
    const progress_spans = document.querySelector("div.AOISUM75").children[2].children[0].children
    let AOI_needed;
    switch (progress_spans.length) {
        // order goes as: earned, in-progress, needs
        case 1:
            // Only needs or only earned (earned only means nothing needs to be done)
            if (progress_spans[0].className == "Needs") {
                course_list.push(["XXX", "A&H/SSc/NSc", 5, "required"]);
                course_list.push(["XXX", "A&H/SSc/NSc", 5, "required"]);
                course_list.push(["XXX", "A&H/SSc/NSc", 5, "required"]);
            }
            break;
        case 2:
            // In-progress and needs, earns and inprogress, or earned and needs (may be a Needs: 1 requirement)
            if (progress_spans[1].className == "inprogress" || progress_spans[1].innerText.match("requirement") !== null) {
                break;
            }
            try {
                console.log(progress_spans[1].lastElementChild.innerText);
                AOI_needed = parseInt(progress_spans[1].lastElementChild.innerText);
            } catch (error) {
                console.log(error);
                break;
            }
            if (AOI_needed <= 15) {
                while (AOI_needed > 0) {
                    if (AOI_needed >= 5) {
                        course_list.push(["XXX", "A&H/SSc/NSc", 5, "required"]);
                        AOI_needed -= 5;
                    } else {
                        course_list.push(["XXX", "A&H/SSc/NSc", AOI_needed, "required"]);
                        AOI_needed = 0;
                    }
                }
            } else {
                course_list.push(["XXX", "A&H/SSc/NSc", 5, "required"]);
                course_list.push(["XXX", "A&H/SSc/NSc", 5, "required"]);
                course_list.push(["XXX", "A&H/SSc/NSc", 5, "required"]);
            }
            break;
        case 3:
            // earned, in-progress, and needs
            if (progress_spans[2].innerText.match("requirement") !== null) {
                //bleh
            }
            try {
                console.log(progress_spans[2].children);
                AOI_needed = parseInt(progress_spans[2].children[0].innerText);
            } catch (error) {
                console.log(error);
                break;
            }
            if (AOI_needed <= 15) {
                while (AOI_needed > 0) {
                    if (AOI_needed >= 5) {
                        course_list.push(["XXX", "A&H/SSc/NSc", 5, "required"]);
                        AOI_needed -= 5;
                    } else {
                        course_list.push(["XXX", "A&H/SSc/NSc", AOI_needed, "required"]);
                        AOI_needed = 0;
                    }
                }
            } else {
                course_list.push(["XXX", "A&H/SSc/NSc", 5, "required"]);
                course_list.push(["XXX", "A&H/SSc/NSc", 5, "required"]);
                course_list.push(["XXX", "A&H/SSc/NSc", 5, "required"]);
            }
            break;

    }
    return course_list;
}

/**
 * Determines what incomplete requirements per section the user has by reading classes.
 * Requires that the Node API is available to use from the browser
 * @param {!Array<!Object>} requirements A list of arrays that contains the course name, the type, and its credits
 * @requires requirements has to have each div have an offsetParent whose classList is a requirement by a degree
 * @returns list of Courses or placeholder courses that the user needs to take
 */
export function TSCIRequirementsOrganizer(requirements) {
    let course_list = [];
    for (let i = 0; i < requirements.length; i++) {
        const offsetParentClassList = requirements[i].offsetParent.classList;
        if (offsetParentClassList.contains("TSCIDATA") || offsetParentClassList.contains("TSCI-DATA")) {
            let text = requirements[i].innerText;
            let category_num = getCategoryNum(text);
            // TODO: make it so that it adds classes on a case by case basis
            switch (category_num) {
                // matches order in DARS of the subrequirements
                case 1:
                    course_list.push(["CSE 421", "CSE", 3, "required"]);
                    course_list.push(["CSE 444", "CSE", 4, "required"]);
                    course_list.push(["CSE 446", "CSE", 4, "required"]);
                    course_list.push(["CSE 442", "CSE", 4, "required"]);
                  break;
                case 2:
                    course_list.push(["CSE 4XX", "CSE", 4, "CSE 427, 455, 484, 447 : https://www.cs.washington.edu/academics/undergraduate/degree-requirements/#data-science"]);
                    break;
                case 3:
                    course_list.push(["CSE 3XX/4XX", "CSE", 4, "https://www.cs.washington.edu/academics/undergraduate/degree-requirements/courses/#core"]);
                    break;
                case 4:
                    course_list.push(["CSE 3XX/4XX", "CSE", 4, "https://www.cs.washington.edu/academics/undergraduate/degree-requirements/courses/#core"]);
                    break;
                default: // suppress to handle electives later
                    console.log(offsetParentClassList, category_num);
                    break;
                    // throw new Error("Entered CSIC Core and got a number subcategory that does not exist: " + category_num);
            }
        } else if (offsetParentClassList.contains("CSCICORE")) {
            let text = requirements[i].innerText;
            let category_num = getCategoryNum(text);
            switch (category_num) {
                case 1:
                    // check for CSE 143 while clearing this
                    course_list.push(["CSE 123", "CSE", 4, "required"]);
                    break;
                case 2:
                    course_list.push(["CSE 311", "CSE", 4, "required"]);
                    course_list.push(["CSE 312", "CSE", 4, "required"]);
                    break;
                case 3:
                    course_list.push(["CSE 331", "CSE", 4, "required"]);
                    course_list.push(["CSE 332", "CSE", 4, "required"]);
                    break;
                case 4:
                    course_list.push(["CSE 351", "CSE", 4, "required"]);
                    break;
                default:
                    console.log(offsetParentClassList, category_num);
                    break;
                    // throw new Error("Entered CSIC Core and got a number subcategory that does not exist: " + category_num);
                }
            
        } else if (offsetParentClassList.contains("CS-MATH") && requirements[i].innerText.match("OR (\)") === null) {
            // Check in filter if MATH 134 and 135 has been completed
            course_list.push(["MATH 124", "CS-MATH", 5, "alternative: MATH 134"]);
            course_list.push(["MATH 125", "CS-MATH", 5, "alternative: MATH 135"]);
            // check if MATH 136 has been completed for both
            course_list.push(["MATH 126", "CS-MATH", 5, "alternative: MATH 136"]);
            course_list.push(["MATH 208", "CS-MATH", 3, "alternative: MATH 136"]);
        } else if (requirements[i].classList.contains("CSCI-NS")) {
            course_list.push(["XXX", "CS-NSc", 5, "https://www.cs.washington.edu/academics/undergraduate/degree-requirements/courses/#cs-natural-science"]);
        } else if (offsetParentClassList.contains("TSCI-SOC")) {
            course_list.push(["SOC 225", "TSCI-SOC", 5, "https://www.cs.washington.edu/academics/undergraduate/degree-requirements/courses/#cs-natural-science"]);
        } else {
            console.log("Else: ", requirements[i]);
            console.log(offsetParentClassList);
            continue;
        }
    }
    return course_list;
}

export function CERequirementsOrganizer(requirements) {
    let course_list = [];
    for (let i = 0; i < requirements.length; i++) {
        const offsetParentClassList = requirements[i].offsetParent.classList;
        if (offsetParentClassList.contains("TCE-EL") || offsetParentClassList.contains("TCEEL")) {
            let text = requirements[i].innerText;
            let category_num = getCategoryNum(text);
            let course_amt = getCourseAmt(text);
            // TODO: make it so that it adds classes on a case by case basis
            switch (category_num) {
                // matches order in DARS of the subrequirements
                case 1:
                  for (let j = 0; j < course_amt; j++) {
                    course_list.push(["CSE 4XX", "CSE", 4, "https://www.cs.washington.edu/academics/undergraduate/degree-requirements/courses/#core"]);
                  }
                  break;
                case 2:
                    for (let j = 0; j < course_amt; j++) {
                        course_list.push(["CSE 4XX", "CE", 4, "https://www.cs.washington.edu/academics/undergraduate/degree-requirements/courses/#ce-electives"]);
                    }
                    break;
                case 3:
                    if (course_amt == 2) {
                        course_list.push(["CSE 3XX/4XX", "CSE", 4, "https://www.cs.washington.edu/academics/undergraduate/degree-requirements/courses/#core"]);
                    }
                    course_list.push(["CSE 3XX/4XX", "CSE", 4, "https://www.cs.washington.edu/academics/undergraduate/degree-requirements/courses/#core"]);
                    break;
                case 4: // capstone case
                    course_list.push(["CSE 4XX", "CSE", 5, "MUST BE A CAPSTONE : https://www.cs.washington.edu/academics/undergraduate/degree-requirements/capstones/"]);
                    break;
                default:
                    console.log(offsetParentClassList, "default");
                    break;
                    // throw new Error("Entered CSIC Core and got a number subcategory that does not exist: " + category_num);
            }
        } else if (offsetParentClassList.contains("CE-CORE") || offsetParentClassList.contains("CECORE")) {
            let text = requirements[i].innerText;
            let category_num = getCategoryNum(text);
            switch (category_num) {
                case 1:
                    course_list.push(["CSE 123", "CSE", 4, "required"]);
                    break;
                case 2:
                    let course_amt = getCourseAmt(text);
                    if (course_amt == 2) {
                        course_list.push(["CSE 311", "CSE", 4, "required"]);
                    }
                    course_list.push(["CSE 312", "CSE", 4, "required"]);
                    break;
                case 3:
                    course_list.push(["CSE 332", "CSE", 4, "required"]);
                    break;
                case 4:
                    // filter these classes
                    course_list.push(["CSE 351", "CSE", 4, "required"]);
                    course_list.push(["CSE 369", "CSE", 4, "required"]);
                    course_list.push(["CSE 371", "CSE", 5, "alternative: E E 205"]);
                    break;
                case 5:
                    course_list.push(["E E 205", "CE", 4, "alternative: E E 215"]);
                default:
                    console.log(offsetParentClassList, "default");
                    break;
                    // throw new Error("Entered CSIC Core and got a number subcategory that does not exist: " + category_num);
                }
            
        } else if (offsetParentClassList.contains("CE-MAT124") && requirements[i].innerText.match("OR (\)") === null) {
            let text = requirements[i].innerText;
            let category_num = getCategoryNum(text);
            let previous_sibling = requirements[i];
            while (previous_sibling.previousElementSibling !== null) {
                previous_sibling = previous_sibling.previousElementSibling;
            }
            let honors_boolean = false;
            if (previous_sibling.children[0].classList.contains("Status_OK")) {
                honors_boolean = previous_sibling.innerText.match("MATH 134") !== null;
            }
            switch (category_num) {
                case 1:
                    course_list.push(["MATH 124", "CE-MATH", 5, "alternative: MATH 134"]);
                    break;
                case 2:
                    if (honors_boolean) {
                        course_list.push(["MATH 135", "CE-MATH", 5, "required"]);
                    } else {
                        course_list.push(["MATH 125", "CE-MATH", 5, "required"]);
                    }
                    break;
                case 3:
                    if (honors_boolean) {
                        course_list.push(["MATH 136", "CE-MATH", 5, "required"]);
                    } else {
                        course_list.push(["MATH 126", "CE-MATH", 5, "required"]);
                    }
                    break;
                case 4:
                    if (!honors_boolean) {
                        course_list.push(["MATH 208", "CE-MATH", 3, "alternative: MATH 136"]);
                    }
                    break;
                default:
                    console.log(offsetParentClassList, "default");
                    break;
                    // throw new Error("Entered CSIC Core and got a number subcategory that does not exist: " + category_num);
            }
        } 
    }
    return course_list;
}

// College Organizers //

export function ArtsAndSciencesOrganizer(requirements) {
    return [["temp", "temp", 5, "temp"]];
}

export function EngineeringOrganizer(requirements) {
    let course_list = [];
    for (let i = 0; i < requirements.length; i++) {
        const offsetParentClassList = requirements[i].offsetParent.classList;
        const text = requirements[i].offsetParent.innerText;
        const category_num = getCategoryNum(text);
        const credits_amt = getCreditsAmt(text);
        if (offsetParentClassList.contains("CE-WRITE") || offsetParentClassList.contains("CEWRITE")) {
            switch (category_num) {
                case 1:
                    course_list.push(["XXX", "C", 5, "required"]);
                    break;
                case 2:
                    let credits_amt = getCourseAmt(text);
                    while (credits_amt > 0) {
                        if (credits_amt < 5) {
                            course_list.push(["XXX", "C/W", credits_amt, "required"]);
                            credits_amt = 0;
                        } else {
                            course_list.push(["XXX", "C/W", 5, "required"]);
                            credits_amt -= 5;
                        }
                    }
                    break;
                default:
                    console.log(offsetParentClassList, "default");
                    break;
                    // throw new Error("Entered CSIC Core and got a number subcategory that does not exist: " + category_num);
                }
        } else if (offsetParentClassList.contains("DIVERSITY")) {
            course_list.push(["XXX", "DIV", 5, "required"]);
        } else if (offsetParentClassList.contains("ENGR-A&H") || offsetParentClassList.contains("ENGRA&H")) {
            while (credits_amt > 0) {
                if (credits_amt < 5) {
                    course_list.push(["XXX", "A&H", credits_amt, "required"]);
                    credits_amt = 0;
                } else {
                    course_list.push(["XXX", "A&H", 5, "required"]);
                    credits_amt -= 5;
                }
                
            }
        } else if (offsetParentClassList.contains("ENGR-SSC") || offsetParentClassList.contains("ENGRSSC")) {
            while (credits_amt > 0) {
                if (credits_amt < 5) {
                    course_list.push(["XXX", "SSc", credits_amt, "required"]);
                    credits_amt = 0;
                } else {
                    course_list.push(["XXX", "SSc", 5, "required"]);
                    credits_amt -= 5;
                }
                
            }
        } else if (offsetParentClassList.contains("ENGRAOI10") || offsetParentClassList.contains("ENGR-AOI10")) {
            while (credits_amt > 0) {
                if (credits_amt < 5) {
                    course_list.push(["XXX", "A&H/SSc", credits_amt, "required"]);
                    credits_amt = 0;
                } else {
                    course_list.push(["XXX", "A&H/SSc", 5, "required"]);
                    credits_amt -= 5;
                }
            }
        } else if (offsetParentClassList.contains("CE-MAT124") || offsetParentClassList.contains("CEMAT124")) {
            const text = requirements[i].innerText;
            const category_num = getCategoryAmt(text);
            switch (category_num) {
                case 1:
                    course_list.push(["MATH 124", "CE-MATH", 5, "required"]);
                    break;
                case 2:
                    // check if this should be replaced with 135 in filter
                    course_list.push(["MATH 125", "CE-MATH", 5, "required"]);
                    break;
                case 3:
                    // check if this should be replaced with 136 in filter
                    course_list.push(["MATH 126", "CE-MATH", 5, "required"]);
                    break;
                case 4:
                    // check if this should be replaced with 136 in filter
                    course_list.push(["MATH 208", "CE-MATH", 3, "required"]);
                    break;
                default:
                    console.log(offsetParentClassList, "default");
                    break;
                    // throw new Error("Entered CSIC Core and got a number subcategory that does not exist: " + category_num);
                }
        } else if (requirements[i].classList.contains("CE-SCI-R") || requirements[i].classList.contains("CESCI-R")) {
            // Need to check div-audit-requirement for CE-SCI-R (not div-subrequirement)
            const classNodes = requirements[i].children[2].children;
            switch (classNodes.length) {
                case 0:
                    course_list.push(["PHYS 121", "CE-SCI", 5, "required"]);
                    course_list.push(["PHYS 122", "CE-SCI", 3, "required"]);
                    break;
                case 1:
                    if (classNodes[0].innerText.match("PHYS 141") !== null) {
                        course_list.push(["PHYS 142", "CE-SCI", 3, "required"]);
                    } else {
                        course_list.push(["PHYS 122", "CE-SCI", 3, "required"]);
                    }
                    break;
                default:
                    console.log(offsetParentClassList, "default");
                    break;
            }
        } else if (requirements[i].classList.contains("CE-SCI-EL") || requirements[i].classList.contains("CESCI-EL")) {
            // Need to check div-audit-requirement for CE-SCI-EL (not div-subrequirement)
            let text = requirements[i].innerText;
            let credits_amt = getCreditsAmt(text);
            while (credits_amt > 0) {
                if (credits_amt < 5) {
                    course_list.push(["XXX", "NSc", credits_amt, "https://www.cs.washington.edu/academics/undergraduate/degree-requirements/courses/#ce-natural-science"]);
                    credits_amt = 0;
                } else {
                    course_list.push(["XXX", "NSc", 5, "https://www.cs.washington.edu/academics/undergraduate/degree-requirements/courses/#ce-natural-science"]);
                    credits_amt -= 5;
                }
            }
        } else {
            console.log("Else: ", requirements[i]);
            console.log(offsetParentClassList);
            continue;
        }
    }
    return course_list;
}

// Filter section //

/**
 * Compares required courses to completed courses to see if any requirements are alrady fulfilled.
 * @param {!Array<!Course>} completed a list of completed courses from getFinishedCourses
 * @param {!Array<!Course>} required an list of required courses that was constructed by a requirements organizer
 * @returns a list of filtered required coursese i.e. courses that are actually required
 */
export function filterRequirements_TSCI(completed, required) {
    let new_required = [];
    for (let i = 0; i < required.length; i++) {
        let index = -1;
        console.log(required[i].name);
        switch (required[i].name) {
            case "MATH 124":
                index = CourseNameIndexOf(completed, "MATH (124|134)");
                if (index == -1) {
                    new_required.push(required[i]);
                }
                break;
            case "MATH 125":
                index = CourseNameIndexOf(completed, "MATH (125|135)");
                if (index == -1) {
                    new_required.push(required[i]);
                }
                break;
            case "MATH 126":
                index = CourseNameIndexOf(completed, "MATH (126|136)");
                if (index == -1) {
                    new_required.push(required[i]);
                }
                break;
            case "MATH 208":
                index = CourseNameIndexOf(completed, "MATH (208|136)");
                if (index == -1) {
                    new_required.push(required[i]);
                }
                break;
            case "CSE 311":
                index = CourseNameIndexOf(completed, "CSE 311");
                console.log("1",required[i].name,index);
                console.log(required[i].name === "CSE 311");
                if (index == -1) {
                    new_required.push(required[i]);
                }
                break;
            case "CSE 312":
                index = CourseNameIndexOf(completed, "CSE 312");
                console.log("2",required[i].name);
                if (index == -1) {
                    new_required.push(required[i]);
                }
                break;
            case "CSE 331":
                index = CourseNameIndexOf(completed, "CSE 331");
                console.log("3",required[i].name);
                if (index == -1) {
                    new_required.push(required[i]);
                }
                break;
            case "CSE 332":
                index = CourseNameIndexOf(completed, "CSE 332");
                console.log("4",required[i].name);
                if (index == -1) {
                    new_required.push(required[i]);
                }
                break;
            case "CSE 421":
                index = CourseNameIndexOf(completed, "CSE 421");
                console.log("5",required[i].name);
                if (index == -1) {
                    new_required.push(required[i]);
                }
                break;
            case "CSE 444":
                index = CourseNameIndexOf(completed, "CSE 444");
                console.log("6",required[i].name);
                if (index == -1) {
                    new_required.push(required[i]);
                }
                break;
            case "CSE 446":
                index = CourseNameIndexOf(completed, "CSE 446");
                console.log("7",required[i].name);
                if (index == -1) {
                    new_required.push(required[i]);
                }
                break;
            case "CSE 442":
                index = CourseNameIndexOf(completed, "CSE 442");
                console.log("8",required[i].name);
                if (index == -1) {
                    new_required.push(required[i]);
                }
                break;
            default:
                new_required.push(required[i]);
        }
    }
    return new_required;
}

/**
 * Compares required courses to completed courses to see if any requirements are alrady fulfilled.
 * @param {!Array<!Course>} completed a list of completed courses from getFinishedCourses
 * @param {!Array<!Course>} required an list of required courses that was constructed by a requirements organizer
 * @returns a list of filtered required coursese i.e. courses that are actually required
 */
export function filterRequirements_CS(completed, required) {
    let new_required = [];
    for (let i = 0; i < required.length; i++) {
        let index = -1;
        console.log(required[i].name);
        switch (required[i].name) {
            case "MATH 124":
                index = CourseNameIndexOf(completed, "MATH (124|134)");
                if (index == -1) {
                    new_required.push(required[i]);
                }
                break;
            case "MATH 125":
                index = CourseNameIndexOf(completed, "MATH (125|135)");
                if (index == -1) {
                    new_required.push(required[i]);
                }
                break;
            case "MATH 126":
                index = CourseNameIndexOf(completed, "MATH (126|136)");
                if (index == -1) {
                    new_required.push(required[i]);
                }
                break;
            case "MATH 208":
                index = CourseNameIndexOf(completed, "MATH (208|136)");
                if (index == -1) {
                    new_required.push(required[i]);
                }
                break;
            case "CSE 311":
                index = CourseNameIndexOf(completed, "CSE 311");
                console.log("1",required[i].name,index);
                console.log(required[i].name === "CSE 311");
                if (index == -1) {
                    new_required.push(required[i]);
                }
                break;
            case "CSE 312":
                index = CourseNameIndexOf(completed, "CSE 312");
                console.log("2",required[i].name);
                if (index == -1) {
                    new_required.push(required[i]);
                }
                break;
            case "CSE 331":
                index = CourseNameIndexOf(completed, "CSE 331");
                console.log("3",required[i].name);
                if (index == -1) {
                    new_required.push(required[i]);
                }
                break;
            case "CSE 332":
                index = CourseNameIndexOf(completed, "CSE 332");
                console.log("4",required[i].name);
                if (index == -1) {
                    new_required.push(required[i]);
                }
                break;
            default:
                new_required.push(required[i]);
                break;
        }
    }
    return new_required;
}

/**
 * Compares required courses to completed courses to see if any requirements are alrady fulfilled.
 * @param {!Array<!Course>} completed a list of completed courses from getFinishedCourses
 * @param {!Array<!Course>} required an list of required courses that was constructed by a requirements organizer
 * @returns a list of filtered required coursese i.e. courses that are actually required
 */
export function filterRequirements_CE(completed, required) {
    let new_required = [];
    for (let i = 0; i < required.length; i++) {
        let index = -1;
        console.log(required[i].name);
        switch (required[i].name) {
            case "CSE 351":
                index = CourseNameIndexOf(completed, "CSE 351");
                console.log("3",required[i].name);
                if (index == -1) {
                    new_required.push(required[i]);
                }
                break;
            case "CSE 369":
                index = CourseNameIndexOf(completed, "CSE 369");
                console.log("4",required[i].name);
                if (index == -1) {
                    new_required.push(required[i]);
                }
                break;
            case "CSE 371":
                index = CourseNameIndexOf(completed, "CSE 371");
                console.log("5",required[i].name);
                if (index == -1) {
                    new_required.push(required[i]);
                }
                break;
            default:
                new_required.push(required[i]);
                break;
        }
    }
    return new_required;
}

/**
 * Given a class list, returns what type of course the div contains
 * @param {NodeList} course_div the list of classes that the div contains
 * @returns A string that represents what class
 */
function searchCourseType_CS(course_div) {
    if (course_div.contains("CSCICORE") || course_div.contains("CSCIELEC") || course_div.contains("CSCI-ELEC")) {
        return "CSE";
    } else if (course_div.contains("TSCI-SOC") || course_div.contains("TSCI-DATA")) {
        return "DS"
    } else if (course_div.contains("CS-MATH")) {
        return "CS-MATH";
    } else if (course_div.contains("CSCI-NS")) {
        return "CS-NSc";
    } else if (course_div.contains("A&SA&HY")) {
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
        return "courseTypeNotFound";
    }
}

/**
 * Given a class list, returns what type of course the div contains
 * @param {NodeList} course_div the list of classes that the div contains
 * @returns A string that represents what class
 */
function searchCourseType_CE(course_div) {
    if (course_div.contains("CE-CORE") || course_div.contains("TCE-EL") || course_div.contains("TCECOECR")) {
        return "CSE";
    } else if (course_div.contains("CE-MAT124")) {
        return "CE-MATH";
    } else if (course_div.contains("CE-SCI-R") || course_div.contains("CE-SCI-EL")) {
        return "CE-NSc";
    } else if (course_div.contains("ENGR-A&H")) {
        return "A&H"
    } else if (course_div.contains("ENGR-SSC")) {
        return "SSc";
    } else if (course_div.contains("ENGRAOI10")) {
        return "A&H/SSc";
    } else if (course_div.contains("ENGLCOMP")) {
        return "C";
    } else if (course_div.contains("FORLANG")) {
        return "FORLANG";
    } else if (course_div.contains("RSN")) {
        return "RSN";
    } else if (course_div.contains("CE-WRITE")) {
        return "WRITING";
    } else if (course_div.contains("DIVERSITY")) {
        return "DIV";
    } else {
        return "courseTypeNotFound";
    }
}

function chooseCollegeMajorType() {
    const audit_header = document.querySelectorAll("div.audit-summary")[0].children[0].innerText;
    if (audit_header.match("COMPUTER SCIENCE: DATA SCIENCE") !== null) {
        return "DS";
    } else if (audit_header.match("COMPUTER ENGINEERING") !== null) {
        return "CE";
    } else {
        return "CS";
    }
}

function returnCourseType(major_name, course_div) {
    switch (major_name) {
        case "DS":
            return searchCourseType_CS(course_div);
        case "CE":
            return searchCourseType_CE(course_div);
        default:
            return searchCourseType_CS(course_div);
    }
}

function returnRequiredOrganizer(major_name, required) {
    switch (major_name) {
        case "DS":
            return ArtsAndSciencesOrganizer(required).concat(TSCIRequirementsOrganizer(required));
        case "CE":
            return EngineeringOrganizer(required).concat(CERequirementsOrganizer(required));
        default:
            return ArtsAndSciencesOrganizer(required).concat(CSRequirementsOrganizer(required));
    }
}

function returnFilter(major_name, completed, required) {
    switch (major_name) {
        case "DS":
            return filterRequirements_TSCI(completed, required);
        case "CE":
            return filterRequirements_CE(completed, required);
        default:
            return filterRequirements_CS(completed, required);
    }
}

function CourseNameIndexOf(array, target) {
    for (let i = 0; i < array.length; i++) {
        if (array[i].name.match(target) !== null) {
            return i;
        }
    }
    return -1;
}

function getCategoryNum(innerText) {
    let category_num = -1;
    let temp;
    try {
        temp = innerText.match("[0-9] (\)");
        if (temp === null) {
            console.log("Category: ", innerText);
            return category_num;
        }
        category_num = parseInt(innerText.charAt(temp.index));
    } catch (error) {
        console.log("Category: ", innerText, error);
        return category_num;
    }
    return category_num;
}

function getCreditsAmt(innerText) {
    let credits_amt = -1;
    let temp;
    try {
        temp = innerText.match("Needs: [0-9]+ credits");
        if (temp === null) {
            console.log("Credits: ", innerText);
            return credits_amt;
        }
        credits_amt = parseInt(temp[0].substring("Needs: ".length));
    } catch (error) {
        console.log("Credits: ", innerText, error);
        return credits_amt;
    }
    return credits_amt;
}

function getCourseAmt(innerText) {
    let course_amt = -1;
    let temp;
    try {
        temp = innerText.match("Needs: [0-9]+ course");
        if (temp === null) {
            console.log("Course: ", innerText);
            return course_amt;
        }
        course_amt = parseInt(temp.substring("Needs: "));
    } catch (error) {
        console.log("Course: ", innerText, error);
        return course_amt;
    }
    return course_amt;
}

export function retrieveDARS() {
    // TODO: Replace temp var with input from user
    const major_name = chooseCollegeMajorType(); // will result in what's on the page currently
    const finished_courses = getFinishedCourses(major_name);
    const required_courses = getRequiredCourses(major_name, finished_courses);
    return [finished_courses, required_courses];
}

