# File Storage System

A nested folder and image storage backend built around a data-modeling problem most CRUD apps skip: **efficiently tracking folder sizes across arbitrarily deep folder trees.**

**Repo:** https://github.com/Shubham043/File-System

---

## The Core Problem

When a file is uploaded into a nested folder, every ancestor folder's total size needs to reflect that change — instantly, and without recomputing the whole subtree on every read.

Three approaches were evaluated:

| Approach | Why it was rejected / chosen |
|---|---|
| `$graphLookup` aggregation | Recomputes the full subtree on every read — doesn't scale |
| Recursive `parentId` traversal | N database round-trips per upload — slow, and gets worse with depth |
| **`ancestors[]` array (chosen)** | O(1) reads, single atomic write on upload |

**The solution:** each folder stores an `ancestors[]` array containing every ancestor folder ID from root down to its immediate parent.

- **On upload:** run a single `updateMany` across `[...folder.ancestors, folder._id]`, wrapped in a MongoDB transaction — if the upload fails, the size update rolls back with it.
- **On read:** folder size is a stored field, not a computation. O(1), every time.

---

## Features

- **User authentication** — signup/login with JWT, passwords hashed via bcrypt
- **Nested folder management** — create, list, and delete folders at any depth
- **Image upload & storage** — abstracted behind a swappable storage layer (Cloudinary by default; local disk or S3 are a 2-line swap)
- **Ownership-scoped access** — every folder and image is denormalized with `userId`, so ownership checks never require a join
- **Atomic size propagation** — folder sizes stay consistent even under concurrent uploads

---

## Tech Stack

- **Runtime:** Node.js, Express
- **Database:** MongoDB (Mongoose)
- **Auth:** JWT, bcryptjs
- **Storage:** Cloudinary (`multer-storage-cloudinary`), with AWS S3 (`@aws-sdk/client-s3`, `multer-s3`) and local disk supported via the same storage abstraction
- **Uploads:** Multer

---

## API Reference

### Auth (`/api/auth`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/signup` | Register a new user |
| POST | `/login` | Authenticate and receive a JWT |

### Folders (`/api/folders`) — requires auth
| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | List root-level folders |
| POST | `/` | Create a new folder |
| GET | `/:id` | Get a folder's contents (subfolders + images) |
| DELETE | `/:id` | Delete a folder |

### Images (`/api/images`) — requires auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/` | Upload an image (`multipart/form-data`, field: `image`) |
| DELETE | `/:id` | Delete an image |

---

## Schema Design

**Folder**
```
name, size, parentId, ancestors[], userId, createdAt
```
- `parentId` → downward traversal (render children)
- `ancestors[]` → upward traversal (size propagation)

**Image**
```
name, url, size, folderId, userId, createdAt
```
- `userId` is denormalized here too, so ownership checks never need a join back to the folder


---

### Installation

```bash
git clone https://github.com/Shubham043/File-System.git
cd File-System
npm install
```

### Environment Variables

Create a `.env` file in the root:

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Run

```bash
# development (with nodemon)
npm run dev

# production
npm start
```

---

## Design Notes

- **Auth:** JWT-based; logout is currently handled client-side (token discard). A Redis-backed token blacklist is a natural next step for server-side invalidation.
- **Storage abstraction:** the storage layer (`utils/storage.js`) is intentionally decoupled from the controllers, so swapping Cloudinary for local disk or S3 doesn't touch route or controller logic.

---

## Future Improvements

- Redis-backed JWT blacklist for real server-side logout
- Folder move/rename with `ancestors[]` re-propagation
- Pagination on folder contents for very large directories
