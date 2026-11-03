/**
 * A Course wrapper that contains information scrapped form the DARS page.
 * 
 * Contains the name of the class in terms of its class code, its full name,
 * the amount of credits it provided, what type of credits it provides with the
 * courseType field, and the special code that signifies any additional information
 * the class for the user's DARS.
 * 
 * The name field can represent a placeholder classes with these special namings:
 * 1. CSE 4XX: this means any course within CSE that is 400 level 
 * 2. XXX: refer to the courseType and CourseCategory 
 *         to see what type of course this needs to be.
 * 3. CSE 3XX/4XX: refers to any 300 or 400 level course 
 */

export class Course {
    name; // string
    courseType; // CourseCategory[]
    credits; // number
    notes; // string

    constructor(name, courseType, credits, notes) {
        this.name = name;
        this.courseType = courseType;
        let parsed_num = parseInt(credits);
        if (Number.isNaN(parsed_num)) {
            throw new Error("Invalid input for credits. Inputted number: " + credits);
        }
        this.credits = parsed_num;
        this.notes = notes;
    }
}

export class CourseOffering {
    name; // string
    title; // string
    description; // string
    courseType; // CourseCategory
    credits_min; // number
    credits_max; // number
    time_info; // CourseOfferingTimeInfo

    constructor(name, title, description, 
                courseType, credits_range, 
                days, time_range) {
        this.name = name.trim();
        this.title = title.trim();
        this.description = description.trim();
        this.courseType = courseType.trim();

        let parsed_num;
        if (credits_range === 'N/A') {
            this.credits_min = 0;
            this.credits_max = 0;
        } else {
            this.credits_min = parseInt(credits_range.substring(0,credits_range.indexOf('-')));
            if (Number.isNaN(parsed_num)) {
                throw new Error("Invalid minimum credits. Check your formatting: " + credits_range.substring(0,credits_range.indexOf('-')));
            }
            this.credits_min = parsed_num;
            parsed_num = parseInt(credits_range.substring(credits_range.indexOf('-') + 1));
            if (Number.isNaN(parsed_num)) {
                throw new Error("Invalid maximum credits. Check your formatting: " + credits_range.substring(credits_range.indexOf('-')));
            }
            this.credits_max = parsed_num;
            this.time_info = new CourseOfferingTimeInfo(days, time_range);
        }
    }

    setName(name) {
        this.name = name.trim();
    }

    setTitle(title) {
        this.title = title.trim();
    }

    setDescription(description) {
        this.description = description.trim();
    }
    
    setCourseType(courseType) {
        this.courseType = courseType.trim();
    }

    setMinCredits(min_credits) {
        let parsed_num;
        parsed_num = parseInt(credits_range.substring(0,credits_range.indexOf('-')));
        if (Number.isNaN(parsed_num)) {
            throw new Error("Invalid minimum credits. Check your formatting.");
        }
        this.credits_min = parsed_num;
    }

    setMaxCredits(max_credits) {
        let parsed_num;
        parsed_num = parseInt(credits_range.substring(credits_range.indexOf('-') + 1));
        if (Number.isNaN(parsed_num)) {
            throw new Error("Invalid maximum credits. Check your formatting.");
        }
        this.credits_max = parsed_num;
    }
}
/**
 * All time is represented in PST as UW is located in this time zone
 */
export class CourseOfferingTimeInfo {
    days; // string MTWTHF, maybe use enum for type safety
    start_time; // string with format HHMM 
    end_time; // string with format HHMM 

    // time range format seperates the two times with a dash (-)
    constructor(days, time_range) {
        if (typeof days != "string") {
            throw new Error("days is not a string : " + days);
        } else if (typeof time_range != "string") {
            throw new Error("time_range is not a string : " + days);
        }
        if (days.trim().match("[^M^T^W^Th^F]")) {
            throw new Error("days contains a character that is not a day : " + days);
        }
        this.days = days.trim();
        if (time_range.indexOf('-') < 0) {
            this.start_time = 'TBA';
            this.end_time = 'TBA';
        } else {
            this.start_time = time_range.substring(0,time_range.indexOf('-')).trim();
            this.end_time = time_range.substring(time_range.indexOf('-') + 1).trim();
        }
    }
    setDays(days) {
        this.days = days.trim();
    }

    setStartTime(start_time) {
        this.start_time = start_time;
    }

    setEndTime(end_time) {
        this.start_time = end_time;
    }
}