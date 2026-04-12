import app from "./app";
import { ENV } from "./config/env";
import { prisma } from "./config/database";

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log("\u2705 Database connected");

    app.listen(ENV.PORT, () => {
      console.log(`\ud83d\ude80 Server running at http://localhost:${ENV.PORT}`);
      console.log(`\ud83d\udcd6 Environment: ${ENV.NODE_ENV}`);
    });
  } catch (err) {
    console.error("\u274c Failed to start:", err);
    process.exit(1);
  }
}

bootstrap();

const app = express();
const PORT = process.env.PORT || 3000;

// Load environment variables
loadEnv();

// Connect to the database
connectToDatabase();

// Middleware
app.use(json());
app.use(urlencoded({ extended: true }));

// Routes
app.use("/api", routes);

// Error handling middleware
app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});