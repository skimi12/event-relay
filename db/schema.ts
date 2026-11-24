import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const listings = sqliteTable("listings", {
  id: text("id").primaryKey(), ownerId: text("owner_id").notNull(), ownerEmail: text("owner_email").notNull(),
  title: text("title").notNull(), category: text("category").notNull(), priceJPY: integer("price_jpy").notNull(), quantity: integer("quantity").notNull(),
  widthCm: real("width_cm").notNull(), depthCm: real("depth_cm").notNull(), heightCm: real("height_cm").notNull(), weightKg: real("weight_kg").notNull(),
  condition: text("condition").notNull(), venue: text("venue").notNull(), addressArea: text("address_area").notNull(),
  pickupStart: text("pickup_start").notNull(), pickupEnd: text("pickup_end").notNull(), description: text("description").notNull(),
  transport: text("transport").notNull(), disassembly: text("disassembly").notNull(), imageUrl: text("image_url").notNull().default(""),
  companyName: text("company_name").notNull(), status: text("status").notNull().default("draft"), reservedRequestId: text("reserved_request_id"),
  rightsConfirmedAt: text("rights_confirmed_at").notNull(), termsVersion: text("terms_version").notNull(),
  createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (t)=>[index("listings_status_deadline_idx").on(t.status,t.pickupEnd),index("listings_owner_idx").on(t.ownerId)]);

export const requests = sqliteTable("requests", {
  id: text("id").primaryKey(), listingId: text("listing_id").notNull().references(()=>listings.id),
  buyerId: text("buyer_id").notNull(), buyerEmail: text("buyer_email").notNull(), buyerCompany: text("buyer_company").notNull(),
  message: text("message").notNull(), pickupAt: text("pickup_at").notNull(), status: text("status").notNull().default("pending"),
  conditionsAcceptedAt: text("conditions_accepted_at").notNull(), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (t)=>[uniqueIndex("requests_listing_buyer_unique").on(t.listingId,t.buyerId),index("requests_buyer_idx").on(t.buyerId),index("requests_listing_idx").on(t.listingId)]);

export const photos = sqliteTable("photos", {
  id: text("id").primaryKey(), ownerId: text("owner_id").notNull(), contentType: text("content_type").notNull(),
  byteLength: integer("byte_length").notNull(), createdAt: text("created_at").notNull(),
}, (t)=>[index("photos_owner_idx").on(t.ownerId)]);
