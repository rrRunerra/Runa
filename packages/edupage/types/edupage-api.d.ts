declare module "edupage-api" {
  export class Edupage extends RawData {
    user: User | Teacher | Student; // Gets assigned automatically after successful login() call

    students: Student[];
    teachers: Teacher[];
    parents: Parent[];

    plans: Plan[];
    classes: Class[];
    classrooms: Classroom[];

    seasons: Season[];
    periods: Period[];
    subjects: Subject[];
    timetables: Timetable[];

    timelineItems: Message[]; // Contains all timeline items (including confirmations)
    timeline: Message[]; // Contains only visible items (messages, assignments, grades...)
    assignments: Assignment[]; // Contains all assignments (homework assignments, tests and other)
    homeworks: Homework[]; // Contains assignments type of homework
    tests: Test[]; // Contains assignments type of test

    ASC: ASC;

    year: number;
    baseUrl: string; // Example: "https://example.edupage.org"

    getUserById(id: string): User | Teacher | Student | Parent | undefined;
    getUserByUserString(
      userString: string,
    ): User | Teacher | Student | Parent | undefined;
    getYearStart(time?: boolean = false): string; // Example: "2020-08-01" or "2020-08-01 00:00:00"

    async getTimetableForDate(date: Date): Promise<Timetable | undefined>; // Note: Calls `fetchTimetablesForDates` method internally if the given timetable is missing

    async fetchTimetablesForDates( // Fetches the timetables from Edupage (+caching and updating existing)
      fromDate: Date,
      toDate: Date,
    ): Promise<Timetable[]>;

    async login(
      username: string,
      password: string,
    ): Promise<User | Teacher | Student>;

    async refresh(): void; // Refreshes all values in current instance
    async refreshEdupage(_update?: boolean = true): void; // Refreshes global Edupage data (such as teachers, classes, classrooms, subjects...)
    async refreshTimeline(_update?: boolean = true): void; // Refreshes timeline data (messages, notifications...)
    async refreshCreatedItems(_update?: boolean = true): void; // Refreshes timeline items data created by currently logged user
    async refreshGrades(_update?: boolean = true): void; // Refreshes grades of currently logged  user

    _updateInternalValues(): void; // Updates all fields of the current instance (called internally after
    // any of the "refresh" methods, if `_update` is set to `true`)

    async uploadAttachment(filepath: string): Promise<Attachment>;
    async api(
      options: APIOptions,
      _count: number = 0,
    ): Promise<RawDataObject | string, Error | { retry: true; count: number }>;

    scheduleSessionPing(): void;
    async pingSession(): Promise<boolean>;

    exit(): void; // Stops internal timers to prevent process from hanging infinitely.

    static compareDay(
      date1: Date | number | string,
      date2: Date | number | string,
    ): boolean;

    static dateToString(date: Date): string; // Converts Date into string (Example: "2020-05-17")
  }
}
