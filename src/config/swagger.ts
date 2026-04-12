import { Express } from "express";
import swaggerUi from "swagger-ui-express";

const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "Nail Booking Pro API",
    version: "1.0.0",
    description: "Swagger documentation for the nail salon booking API.",
  },
  servers: [
    {
      url: "/api/v1",
      description: "Base API",
    },
  ],
  tags: [
    { name: "Health", description: "Service health checks" },
    { name: "Auth", description: "Authentication endpoints" },
    { name: "Services", description: "Service catalog and administration" },
    { name: "Bookings", description: "Booking workflow endpoints" },
    { name: "Staff", description: "Staff listing" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Something went wrong" },
        },
      },
      AuthRegisterInput: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: { type: "string", example: "Nguyen Van A" },
          email: { type: "string", format: "email", example: "a@example.com" },
          phone: { type: "string", example: "0901234567" },
          password: { type: "string", format: "password", example: "secret123" },
        },
      },
      AuthLoginInput: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "a@example.com" },
          password: { type: "string", format: "password", example: "secret123" },
        },
      },
      ServiceInput: {
        type: "object",
        required: ["name", "duration", "price", "category"],
        properties: {
          name: { type: "string", example: "Gel Manicure" },
          description: { type: "string", example: "Long-lasting gel colour" },
          image: { type: "string", format: "uri", example: "https://images.unsplash.com/example" },
          duration: { type: "integer", example: 45 },
          price: { type: "number", example: 30 },
          category: { type: "string", example: "Manicure" },
          isActive: { type: "boolean", example: true },
        },
      },
      Service: {
        allOf: [
          { $ref: "#/components/schemas/ServiceInput" },
          {
            type: "object",
            properties: {
              id: { type: "string", example: "gel-manicure" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
        ],
      },
      CreateBookingInput: {
        type: "object",
        required: ["serviceId", "startTime", "customerName", "customerPhone"],
        properties: {
          serviceId: { type: "string", example: "gel-manicure" },
          staffId: { type: "string", example: "clx123staff" },
          startTime: { type: "string", format: "date-time", example: "2026-04-20T10:00:00.000Z" },
          customerName: { type: "string", example: "Nguyen Van A" },
          customerPhone: { type: "string", example: "0901234567" },
          customerEmail: { type: "string", format: "email", example: "a@example.com" },
          notes: { type: "string", example: "Please prepare pastel colors" },
        },
      },
      UpdateBookingStatusInput: {
        type: "object",
        required: ["status"],
        properties: {
          status: {
            type: "string",
            enum: ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"],
            example: "CONFIRMED",
          },
        },
      },
      Booking: {
        type: "object",
        properties: {
          id: { type: "string" },
          userId: { type: "string", nullable: true },
          customerName: { type: "string" },
          customerPhone: { type: "string" },
          customerEmail: { type: "string", nullable: true },
          serviceId: { type: "string" },
          staffId: { type: "string", nullable: true },
          startTime: { type: "string", format: "date-time" },
          endTime: { type: "string", format: "date-time" },
          duration: { type: "integer" },
          totalPrice: { type: "number" },
          status: {
            type: "string",
            enum: ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"],
          },
          notes: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Staff: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          bio: { type: "string", nullable: true },
          avatar: { type: "string", nullable: true },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: {
          "200": {
            description: "Service is healthy",
          },
        },
      },
    },
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthRegisterInput" },
            },
          },
        },
        responses: {
          "201": { description: "User registered" },
          "400": { description: "Validation failed" },
          "409": { description: "Email already exists" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login and receive JWT token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthLoginInput" },
            },
          },
        },
        responses: {
          "200": { description: "Login successful" },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current user profile",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Current user profile" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/services": {
      get: {
        tags: ["Services"],
        summary: "Get services with filter query params",
        parameters: [
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "isActive", in: "query", schema: { type: "boolean" } },
          { name: "minPrice", in: "query", schema: { type: "number" } },
          { name: "maxPrice", in: "query", schema: { type: "number" } },
          { name: "minDuration", in: "query", schema: { type: "integer" } },
          { name: "maxDuration", in: "query", schema: { type: "integer" } },
          {
            name: "sortBy",
            in: "query",
            schema: { type: "string", enum: ["name", "price", "duration", "category", "createdAt"] },
          },
          { name: "order", in: "query", schema: { type: "string", enum: ["asc", "desc"] } },
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          "200": { description: "List of services" },
        },
      },
      post: {
        tags: ["Services"],
        summary: "Create a service",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ServiceInput" },
            },
          },
        },
        responses: {
          "201": { description: "Service created" },
          "400": { description: "Validation failed" },
          "403": { description: "Forbidden" },
        },
      },
    },
    "/services/categories": {
      get: {
        tags: ["Services"],
        summary: "Get distinct service categories",
        responses: {
          "200": { description: "Categories list" },
        },
      },
    },
    "/services/{id}": {
      get: {
        tags: ["Services"],
        summary: "Get service by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Service details" },
          "404": { description: "Service not found" },
        },
      },
      patch: {
        tags: ["Services"],
        summary: "Update a service",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ServiceInput" },
            },
          },
        },
        responses: {
          "200": { description: "Service updated" },
        },
      },
      delete: {
        tags: ["Services"],
        summary: "Soft-delete a service",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Service deactivated" },
        },
      },
    },
    "/services/{id}/hard": {
      delete: {
        tags: ["Services"],
        summary: "Hard-delete a service",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Service deleted" },
        },
      },
    },
    "/bookings/available-slots": {
      get: {
        tags: ["Bookings"],
        summary: "Get available slots for a service/date",
        parameters: [
          { name: "serviceId", in: "query", required: true, schema: { type: "string" } },
          { name: "date", in: "query", required: true, schema: { type: "string", example: "2026-04-20" } },
          { name: "staffId", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Available slots" },
        },
      },
    },
    "/bookings": {
      get: {
        tags: ["Bookings"],
        summary: "List all bookings for admin/staff",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"] } },
          { name: "date", in: "query", schema: { type: "string", example: "2026-04-20" } },
          { name: "staffId", in: "query", schema: { type: "string" } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          "200": { description: "Bookings list" },
        },
      },
      post: {
        tags: ["Bookings"],
        summary: "Create a booking as guest or logged-in user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateBookingInput" },
            },
          },
        },
        responses: {
          "201": { description: "Booking created and pending confirmation" },
          "409": { description: "Time slot conflict" },
        },
      },
    },
    "/bookings/mine": {
      get: {
        tags: ["Bookings"],
        summary: "Get current user's bookings",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "User bookings" },
        },
      },
    },
    "/bookings/{id}": {
      get: {
        tags: ["Bookings"],
        summary: "Get a single booking",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Booking detail" },
          "404": { description: "Booking not found" },
        },
      },
    },
    "/bookings/{id}/cancel": {
      patch: {
        tags: ["Bookings"],
        summary: "Cancel own booking",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Booking cancelled" },
        },
      },
    },
    "/bookings/{id}/status": {
      patch: {
        tags: ["Bookings"],
        summary: "Update booking status as admin/staff",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateBookingStatusInput" },
            },
          },
        },
        responses: {
          "200": { description: "Booking status updated" },
        },
      },
    },
    "/staff": {
      get: {
        tags: ["Staff"],
        summary: "Get active staff list",
        responses: {
          "200": { description: "Staff list" },
        },
      },
    },
  },
} as const;

export const setupSwagger = (app: Express) => {
  app.get("/docs.json", (_req, res) => {
    res.json(swaggerDocument);
  });

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true,
    },
  }));
};

export { swaggerDocument };