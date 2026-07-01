import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

# Load environmental variables
load_dotenv()

DATABASE_ENV = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./webcraft.db")
if DATABASE_ENV.startswith("sqlite+aiosqlite:///./"):
    # Make relative path absolute relative to backend folder
    relative_path = DATABASE_ENV.replace("sqlite+aiosqlite:///./", "")
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    db_path = os.path.join(base_dir, relative_path)
    DATABASE_URL = f"sqlite+aiosqlite:///{db_path}"
else:
    DATABASE_URL = DATABASE_ENV

# Configure SQLite threading options
engine_args = {}
if DATABASE_URL.startswith("sqlite"):
    engine_args["connect_args"] = {"check_same_thread": False}

# Create async engine and sessionmaker
engine = create_async_engine(DATABASE_URL, **engine_args)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()

# FastAPI db session generator
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
