import fs from "fs/promises";
import path from "path";

const DB_FILE = path.join(process.cwd(), "db.json");

async function cleanup() {
  console.log("Starting DB cleanup...");
  try {
    const data = await fs.readFile(DB_FILE, "utf-8");
    const db = JSON.parse(data);
    
    let changed = false;
    if (db.users) {
      db.users = db.users.map((u) => {
        if (u.avatar && u.avatar.startsWith('data:') && u.avatar.length > 50000) {
          console.log(`Truncating avatar for user: ${u.username} (${u.avatar.length} chars)`);
          changed = true;
          return { ...u, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}` };
        }
        return u;
      });
    }

    if (db.diaries) {
      db.diaries = db.diaries.map((d) => {
        if (d.images) {
          d.images = d.images.map((img) => {
            if (img.startsWith('data:') && img.length > 50000) {
              console.log(`Truncating large image in diary ${d.id} (${img.length} chars)`);
              changed = true;
              return "https://images.unsplash.com/photo-1516715094483-75da7dee9758?w=800&q=80"; // Fallback image
            }
            return img;
          });
        }
        return d;
      });
    }

    if (db.albumImages) {
      db.albumImages = db.albumImages.map((img) => {
        if (img.src && img.src.startsWith('data:') && img.src.length > 50000) {
          console.log(`Truncating large image in album ${img.id} (${img.src.length} chars)`);
          changed = true;
          return { ...img, src: "https://picsum.photos/seed/love/400/500" };
        }
        return img;
      });
    }

    if (changed) {
      await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
      console.log("DB cleaned and saved.");
    } else {
      console.log("No massive avatars found.");
    }
  } catch (error) {
    console.error("Cleanup failed:", error);
  }
}

cleanup();
