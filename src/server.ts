import app from "./app";
import { ENV } from "./config/env";
import { prisma } from "./config/database";
import { verifyEmailTransport } from "./services/email.service";

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log("\u2705 Database connected");
    await verifyEmailTransport();

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