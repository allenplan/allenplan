
export class Course {
    name; // string
    courseType; // CourseCategory
    credits; // number

    constructor(name, courseType, credits) {
        this.name = name;
        this.courseType = courseType;
        let parsed_num = parseInt(credits);
        if (Number.isNaN(parsed_num)) {
            throw new Error("Invalid input for credits. Inputted number: " + credits);
        }
        this.credits = parsed_num;
    }
}

export class CourseOffering {
    name; // string
    title; // string
    description; // string
    courseType; // CourseCategory
    credits_min; // number
    credits_max; // number
    days; // string MTWTHF, maybe use enum for type safety
    start_time; // string with format HHMM 
    end_time; // string with format HHMM 

    constructor() {
        this.name = null;
        this.title = null;
        this.description = null;
        this.courseType = null;
        this.credits_min = null;
        this.credits_max = null;
        this.days = null;
        this.start_time = null;
        this.end_time = null;
    }

    constructor(name, title, description, 
                courseType, credits_range, 
                days, time_range) {
        this.name = name.trim();
        this.title = title.trim();
        this.description = description.trim();
        this.courseType = courseType.trim();
        this.days = days.trim();
        

        let parsed_num;
        this.credits_min = parseInt(credits_range.substring(0,credits_range.indexOf('-')));
        if (Number.isNaN(parsed_num)) {
            throw new Error("Invalid minimum credits. Check your formatting.");
        }
        this.credits_min = parsed_num;
        parsed_num = parseInt(credits_range.substring(credits_range.indexOf('-')));
         if (Number.isNaN(parsed_num)) {
            throw new Error("Invalid maximum credits. Check your formatting.");
        }
        this.credits_max = parsed_num;
        if (time_range.indexOf('-') < 0) {
            this.start_time = 'TBA';
            this.end_time = 'TBA';
        } else {
            this.start_time = time_range.substring(0,time_range.indexOf('-')).trim();
            this.end_time = time_range.substring(time_range.indexOf('-')).trim();
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
    
    setDays(days) {
        this.days = days.trim();
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
        parsed_num = parseInt(credits_range.substring(0,credits_range.indexOf('-')));
        if (Number.isNaN(parsed_num)) {
            throw new Error("Invalid maximum credits. Check your formatting.");
        }
        this.credits_max = parsed_num;
    }

    setStartTime(start_time) {
        this.start_time = start_time;
    }

    setEndTime(end_time) {
        this.start_time = end_time;
    }
}

class CSCoreElectives {
    FourCoreHigher
    TwoAdditionalCore
    OneCoreOrCapstone

}