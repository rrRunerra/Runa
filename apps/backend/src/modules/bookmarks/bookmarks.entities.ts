export default class BookmarkEntity {
  id: string;
  userId: string;
  name: string;
  description: string;
  redirect: string;
  stars: any[];
  connections: number[][];
  icon: string | null;
  connectionColor: string | null;
  starColor: string | null;
  createdAt: Date;
  updatedAt: Date;
}
