// WORK IN PROGRESS //
enum CourseCategory{
    "A&H",
    "DIV",
    "SSc",
    "NSc",
    "RSN",
    "W",
    "CS",
    "CE"
}
class Course {
    name: String
    courseType: CourseCategory
    credits: number
    preReqs: Course[][] // 2-D array of courses
    recommendation: string
}

let reqList: Course[];
let fulfillList: Course[];

// CONSTANTS
const courseTitleLength = 8; // "CSE 121 ".length

/**
 * Parses the student's DARS audit degree page to collect what classes they have completed or are in progress.
 * 
 * Uses the provided Course class as a template to fill out its name, the course type, and its credits.
 * Leaves the preReqs and recommendedCourses fields as null
 * 
 * @requires 'https://myplan.uw.edu/audit/#/degree' needs to be open, 
 * an audit has to have been ran, and javascript must be allowed to execute on the page.
 * @returns Course[] an array of courses that the student has finished or is in progress of taking
 */
async function retrieveFinishedClasses() {
    if (document.URL != "https://myplan.uw.edu/audit/#/degree") {
        throw "Wrong website. Navigate to https://myplan.uw.edu/audit/#/degree"
    }
    const tables = document.querySelectorAll("tbody");
    for (let index = 0; index < tables.length; index++) {
        // grab the table body
        let table_children = tables[index].children; // <tr class> or <tr class=ip>
        for (let class_index = 0; class_index < table_children.length; class_index++) {
            // iterate
        }
        
    }

}

// Needs "https://www.washington.edu/students/crscat/cse.html" to be open
// Look at dawgpath.uw.edu if user is willing to login (id=collapsePrereqs_# align with site mentioned above)
// document.querySelectorAll("div[id^='collapsePrereqs_']") to grab list and look at previous sibling for the name of course
/**
 * Parses the provided CSE course offerings and returns data specific to the desired class. 
 * 
 * It provides the course's full name, its credits, the type of class it is, 
 * its prerequisites, and recommendations.
 * 
 * Throws an error message if the class is not found, user is not executing this on the required page,
 * 
 * 
 * @requires 'https://www.washington.edu/students/crscat/cse.html' needs to be open and javascript must be allowed to execute on the page.
 * @param courseName The short name code for the class that wants to be searched (Ex. CSE 121)
 * @returns Course class that contains its
 */
async function grabClassData(courseName: String) {
    if (document.URL != "https://www.washington.edu/students/crscat/cse.html") {
        throw "Wrong website. Navigate to https://www.washington.edu/students/crscat/cse.html"
    }

    const name: string = courseName.split(" ").join("").toLowerCase(); // CSE 121 -> cse121
    const results = document.querySelectorAll("a[name=" + name + "]");
    if (results.length === 0) {
        // not a valid class
        throw "Class could not be found in the CSE class database. Check your input format or enter a valid class"; 
    }

    let new_course = new Course();
    const course_info = results[1].children; // results[0] is empty
    const title = course_info[0]; // <b>
    // credit search //
    let read_credits: number;
    read_credits = parseInt(title.innerHTML.charAt(title.innerHTML.indexOf("(") + 1)); // only works with single digit credit classes
    if (Number.isNaN(read_credits)) {
        // error for invalid read of integer
        throw "Could not read the amount of credits for this class."; 
    }
    
    new_course.name = title.innerHTML.substring(courseTitleLength, title.innerHTML.indexOf("(")).trim();
    new_course.credits = read_credits;
    // preReq and recommendations search //
    // ';' and 'and' (both these can mean another prerequisite)
    //
    // or (interchangeable prerequisite with the class afterwards, might be a list
    // with commas. Can have keyword 'either' before it so disregard when parsing)
    //
    // '/' can mean different names or alternatives like STAT395/MATH395 (check CSE 416)
    //
    // Capital letters usually signify a school/class
    // 
    // All class codes are 3 digits (use it to signify the end of class parsing)
    //
    // End of prerequisite list can end in '.' or ';'. ';' case usually has the 
    // word "recommended" afterwards.
    let text = results[1].childNodes[2].nodeValue;
    if (text === null) {
        throw "Failed to parse course description of " + name;
    }
    // override strict type checking, 
    if (text!.indexOf("Prerequisite: ") >= 0) {
        let preReqString = text?.substring(text?.indexOf("Prerequisite:") + "Prerequisite: ".length);
    }
    new_course.recommendation = text!.substring(text!.search(/recommended: /i) + "recommended: ".length);
    


}


/**
 * Helper function to check if a character is uppercase
 * @requires char to be length of 1
 * @param char the character to be checked
 * @returns true if the character is uppercase, false otherwise
 */
async function isUpper(char: string) {
    return (/[A-Z]/.test(char));
}