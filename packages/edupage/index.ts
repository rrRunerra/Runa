import { Edupage } from "edupage-api";

export class EdupageUtils {
  private static instance: EdupageUtils;
  public edupage: Edupage;

  private constructor() {
    this.edupage = new Edupage();
  }

  public static getInstance(): EdupageUtils {
    if (!EdupageUtils.instance) {
      EdupageUtils.instance = new EdupageUtils();
    }
    return EdupageUtils.instance;
  }

  public async login() {
    await this.edupage.login(process.env.EDU_NAME!, process.env.EDU_PASS!);
  }

  public getTeachers() {
    return this.edupage.teachers.map((teacher) => {
      return {
        firstName: teacher.firstname,
        lastName: teacher.lastname,
        shortName: teacher.short,
        id: teacher.id,
      };
    });
  }

  public async getMaterial(homework: any) {
    const assignment = this.edupage.assignments.find((assig: any) =>
      assig.title.startsWith(homework.title),
    );

    if (!assignment) {
      console.info(`Assignment not found for homework: ${homework.title}`);
      return;
    }

    const material = await assignment.getData().catch(async (err: Error) => {
      console.error(`Error while getting Material: ${err}`);
      return;
    });

    if (!material?.materialData) {
      console.info(`Material data not found for homework: ${homework.title}`);
      return null;
    }
    return material.materialData;
  }

  public stripHtmlTags(text: String): string {
    if (!text) return "";
    return text.toString().replace(/<[^>]*>/g, "");
  }

  public removeDuplicateYouTubeLinks(links: string[]): string[] {
    const videoIdsSet = new Set<string>();
    const uniqueLinks: string[] = [];

    links.forEach((link) => {
      const videoId = this.extractVideoId(link);
      if (videoId && !videoIdsSet.has(videoId)) {
        videoIdsSet.add(videoId);
        uniqueLinks.push(link);
      } else if (!videoId) {
        uniqueLinks.push(link);
      }
    });

    return uniqueLinks;
  }

  private extractVideoId(link: string): string | null {
    const regex =
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = link.match(regex);
    return match ? match[1] : null;
  }

  public chunkString(str: string, length: number): string[] {
    const chunks = [];
    let i = 0;
    while (i < str.length) {
      chunks.push(str.slice(i, i + length));
      i += length;
    }
    return chunks;
  }
}
