# Architecture Decisions

## Problem: Nested Folder Size Calculation

### Chosen Approach: Ancestors Array + Stored Size

Each folder stores an `ancestors` array containing all ancestor folder IDs from root to immediate parent.

**On upload — single query updates all ancestors atomically:**
- Find the target folder
- Run updateMany on [...folder.ancestors, folder._id]
- Wrapped in MongoDB transaction — rollback if upload fails

**On read — O(1), size is a direct field**

### Why not alternatives:
- $graphLookup: recomputes on every read, slow at scale
- Recursive parentId traversal: N DB round trips per upload

## Schema Design

**Folder:** name, size, parentId, ancestors[], userId, createdAt
- parentId → downward traversal (render children)
- ancestors[] → upward traversal (size propagation)

**Image:** name, url, size, folderId, userId, createdAt
- userId denormalized for direct ownership checks without joins

## Indexes
- Folder: { userId, parentId } compound
- Image: { userId, folderId } compound
- User: { email } unique

## Storage
Cloudinary for image storage. Local disk abstraction in storage.js makes it a 2-line swap.

## Auth
JWT. Logout handled client-side. Redis token blacklist can be added later.
