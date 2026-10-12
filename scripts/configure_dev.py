"""Create local Compose secrets once; never print or overwrite them."""

import secrets
from pathlib import Path


def main() -> None:
    destination = Path(__file__).resolve().parents[1] / ".env"
    try:
        with destination.open("x", encoding="utf-8") as file:
            file.write(
                f"POSTGRES_PASSWORD={secrets.token_hex(24)}\n"
                f"JWT_SECRET={secrets.token_hex(40)}\n"
                f"RUNNER_TOKEN={secrets.token_hex(40)}\n"
                "ALLOWED_ORIGIN=http://localhost:3010\n"
                "FRONTEND_PORT=3010\n"
                "ENVIRONMENT=development\nCOOKIE_SECURE=false\n"
                "EXECUTION_RUNNER=remote\n"
            )
    except FileExistsError:
        print("Existing .env kept. Edit it explicitly to change configuration.")
    else:
        print("Created .env with fresh local secrets.")


if __name__ == "__main__":
    main()
