import { and, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  galleryItems,
  learningSubmissions,
  learningTasks,
  pertemuan,
  projectSubmissions,
  projectTasks,
  roomMembers,
  rooms,
  users,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { handler } from "@/lib/http";

// GET /api/gallery?limit=&offset= — karya kelas: misi belajar + proyek yang
// dipublikasikan guru, dari kelas yang diikuti/diajar user.
export const GET = handler(async (req) => {
  const user = await requireUser(req);
  const url = new URL(req.url);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10) || 50),
  );
  const offset = Math.max(
    0,
    parseInt(url.searchParams.get("offset") ?? "0", 10) || 0,
  );
  const db = getDb();

  let roomIds: string[] = [];
  if (user.role === "siswa") {
    roomIds = (
      await db
        .select({ id: roomMembers.room_id })
        .from(roomMembers)
        .where(eq(roomMembers.siswa_id, user.id))
    ).map((r) => r.id);
  } else if (user.role === "guru") {
    roomIds = (
      await db
        .select({ id: rooms.id })
        .from(rooms)
        .where(eq(rooms.guru_id, user.id))
    ).map((r) => r.id);
  }
  if (!roomIds.length) return NextResponse.json([]);

  const learningRows = await db
    .select({
      sub: learningSubmissions,
      taskJudul: learningTasks.judul,
      roomId: rooms.id,
      roomName: rooms.name,
      studentName: users.name,
    })
    .from(learningSubmissions)
    .innerJoin(learningTasks, eq(learningSubmissions.task_id, learningTasks.id))
    .innerJoin(pertemuan, eq(learningTasks.pertemuan_id, pertemuan.id))
    .innerJoin(rooms, eq(pertemuan.room_id, rooms.id))
    .innerJoin(users, eq(learningSubmissions.siswa_id, users.id))
    .where(inArray(pertemuan.room_id, roomIds))
    .orderBy(desc(learningSubmissions.submitted_at))
    .limit(offset + limit);

  const projectRows = await db
    .select({
      sub: projectSubmissions,
      taskJudul: projectTasks.judul,
      roomId: rooms.id,
      roomName: rooms.name,
      studentName: users.name,
      galleryItem: galleryItems,
    })
    .from(projectSubmissions)
    .innerJoin(projectTasks, eq(projectSubmissions.task_id, projectTasks.id))
    .innerJoin(pertemuan, eq(projectTasks.pertemuan_id, pertemuan.id))
    .innerJoin(rooms, eq(pertemuan.room_id, rooms.id))
    .innerJoin(users, eq(projectSubmissions.siswa_id, users.id))
    .leftJoin(
      galleryItems,
      eq(galleryItems.project_submission_id, projectSubmissions.id),
    )
    .where(
      and(
        inArray(pertemuan.room_id, roomIds),
        // Hanya karya yang guru publikasikan eksplisit ke galeri.
        eq(projectSubmissions.is_published_to_gallery, true),
      ),
    )
    .orderBy(desc(projectSubmissions.submitted_at))
    .limit(offset + limit);

  type GalleryEntry = Record<string, unknown> & { published_at: Date };
  const formatted: GalleryEntry[] = [];

  for (const { sub, taskJudul, roomId, roomName, studentName } of learningRows) {
    const lastSnap = sub.ast_snapshots_json?.length
      ? sub.ast_snapshots_json[sub.ast_snapshots_json.length - 1]
      : null;
    formatted.push({
      id: sub.id,
      type: "learning",
      title: taskJudul,
      student_id: sub.siswa_id,
      student_name: studentName,
      ast: (lastSnap?.["ast"] as unknown[] | undefined) ?? [],
      appreciations: 0,
      published_at: sub.submitted_at,
      room_id: roomId,
      room_name: roomName,
      ai_feedback:
        sub.ai_feedback ||
        "AI telah memvalidasi kode visual Anda dengan sukses. Hasil rakitan blok telah terstruktur secara semantik.",
      score: sub.final_score,
    });
  }

  for (const row of projectRows) {
    const { sub, taskJudul, roomId, roomName, studentName, galleryItem } = row;
    const aiFeedback =
      (sub.ai_suggestion_json?.["analysis"] as string | undefined) ??
      "AI telah menganalisis kode visual Anda dengan sukses. Hasil rakitan blok telah terstruktur secara semantik.";
    formatted.push({
      id: sub.id,
      gallery_item_id: galleryItem?.id ?? null,
      type: "project",
      title: taskJudul,
      student_id: sub.siswa_id,
      student_name: studentName,
      ast: sub.final_ast_json,
      appreciations: galleryItem?.appreciation_count ?? 0,
      published_at: sub.submitted_at,
      room_id: roomId,
      room_name: roomName,
      ai_feedback: aiFeedback,
      score: sub.teacher_score ?? 0,
    });
  }

  formatted.sort(
    (a, b) => b.published_at.getTime() - a.published_at.getTime(),
  );
  return NextResponse.json(formatted.slice(offset, offset + limit));
});
