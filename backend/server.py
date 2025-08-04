from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security settings
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    full_name: str
    hashed_password: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    username: str
    email: str
    full_name: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class Subscription(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    phone: str
    technology: str  # "Starlink" or "VSAT"
    plan: str
    bandwidth: str
    frequency: str  # "C-band", "Ku-band", "Ka-band"
    amount: int
    duration_months: int
    start_date: datetime
    end_date: datetime
    status: str = "active"  # "active", "expiring", "expired"
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SubscriptionCreate(BaseModel):
    client_name: str
    phone: str
    technology: str
    plan: str
    bandwidth: str
    frequency: str
    amount: int
    duration_months: int
    start_date: datetime

class Alert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    subscription_id: str
    client_name: str
    message: str
    alert_type: str  # "expiring", "expired"
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Security functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"username": username})
    if user is None:
        raise credentials_exception
    return User(**user)

# Authentication routes
@api_router.post("/register", response_model=dict)
async def register_user(user: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"$or": [{"username": user.username}, {"email": user.email}]})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    user_dict = user.dict()
    del user_dict["password"]
    user_dict["hashed_password"] = hashed_password
    
    new_user = User(**user_dict)
    await db.users.insert_one(new_user.dict())
    
    return {"message": "User created successfully"}

@api_router.post("/login", response_model=Token)
async def login_user(user_credentials: UserLogin):
    user = await db.users.find_one({"username": user_credentials.username})
    if not user or not verify_password(user_credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    
    user_data = {
        "id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "full_name": user["full_name"]
    }
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_data
    }

@api_router.get("/me")
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

# Dashboard routes
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    total_subscribers = await db.subscriptions.count_documents({})
    active_subscriptions = await db.subscriptions.count_documents({"status": "active"})
    expiring_subscriptions = await db.subscriptions.count_documents({"status": "expiring"})
    expired_subscriptions = await db.subscriptions.count_documents({"status": "expired"})
    
    # Calculate total revenue (sum of all active subscriptions)
    pipeline = [
        {"$match": {"status": "active"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    revenue_result = await db.subscriptions.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    # Technology breakdown
    tech_pipeline = [
        {"$group": {"_id": "$technology", "count": {"$sum": 1}}}
    ]
    tech_breakdown = await db.subscriptions.aggregate(tech_pipeline).to_list(10)
    
    # Alerts count
    alerts_count = await db.alerts.count_documents({})
    
    return {
        "total_subscribers": total_subscribers,
        "monthly_revenue": total_revenue,
        "active_subscriptions": active_subscriptions,
        "urgent_alerts": alerts_count,
        "technology_breakdown": tech_breakdown,
        "status_breakdown": {
            "active": active_subscriptions,
            "expiring": expiring_subscriptions,
            "expired": expired_subscriptions
        }
    }

@api_router.get("/dashboard/revenue-chart")
async def get_revenue_chart(current_user: User = Depends(get_current_user)):
    # Mock data for revenue chart - in real implementation, aggregate by month
    return {
        "labels": ["Jan", "Fév", "Mars", "Avr", "Mai", "Juin"],
        "data": [42000000, 45000000, 43500000, 46800000, 45200000, 47500000]
    }

# Subscription routes
@api_router.get("/subscriptions", response_model=List[Subscription])
async def get_subscriptions(current_user: User = Depends(get_current_user)):
    # Update subscription statuses first
    await update_subscription_statuses()
    subscriptions = await db.subscriptions.find().to_list(1000)
    return [Subscription(**sub) for sub in subscriptions]

@api_router.post("/subscriptions", response_model=Subscription)
async def create_subscription(subscription: SubscriptionCreate, current_user: User = Depends(get_current_user)):
    # Calculate end date
    end_date = subscription.start_date + timedelta(days=subscription.duration_months * 30)
    
    subscription_dict = subscription.dict()
    subscription_dict["end_date"] = end_date
    
    new_subscription = Subscription(**subscription_dict)
    await db.subscriptions.insert_one(new_subscription.dict())
    
    return new_subscription

@api_router.put("/subscriptions/{subscription_id}", response_model=Subscription)
async def update_subscription(
    subscription_id: str, 
    subscription: SubscriptionCreate, 
    current_user: User = Depends(get_current_user)
):
    end_date = subscription.start_date + timedelta(days=subscription.duration_months * 30)
    subscription_dict = subscription.dict()
    subscription_dict["end_date"] = end_date
    
    result = await db.subscriptions.update_one(
        {"id": subscription_id}, 
        {"$set": subscription_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    updated_subscription = await db.subscriptions.find_one({"id": subscription_id})
    return Subscription(**updated_subscription)

@api_router.delete("/subscriptions/{subscription_id}")
async def delete_subscription(subscription_id: str, current_user: User = Depends(get_current_user)):
    result = await db.subscriptions.delete_one({"id": subscription_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    return {"message": "Subscription deleted successfully"}

# Alerts routes
@api_router.get("/alerts", response_model=List[Alert])
async def get_alerts(current_user: User = Depends(get_current_user)):
    alerts = await db.alerts.find().sort("created_at", -1).to_list(100)
    return [Alert(**alert) for alert in alerts]

# Utility function to update subscription statuses
async def update_subscription_statuses():
    now = datetime.utcnow()
    expiry_threshold = now + timedelta(days=30)  # 30 days before expiry
    
    # Mark as expiring (30 days before expiry)
    await db.subscriptions.update_many(
        {"end_date": {"$lte": expiry_threshold, "$gt": now}, "status": "active"},
        {"$set": {"status": "expiring"}}
    )
    
    # Mark as expired
    await db.subscriptions.update_many(
        {"end_date": {"$lte": now}, "status": {"$in": ["active", "expiring"]}},
        {"$set": {"status": "expired"}}
    )
    
    # Generate alerts for expiring subscriptions
    expiring_subs = await db.subscriptions.find({"status": "expiring"}).to_list(1000)
    for sub in expiring_subs:
        existing_alert = await db.alerts.find_one({
            "subscription_id": sub["id"], 
            "alert_type": "expiring"
        })
        if not existing_alert:
            alert = Alert(
                subscription_id=sub["id"],
                client_name=sub["client_name"],
                message=f"Abonnement {sub['plan']} ({sub['frequency']}) expire le {sub['end_date'].strftime('%d/%m/%Y')}",
                alert_type="expiring"
            )
            await db.alerts.insert_one(alert.dict())

# Run status update on startup
@app.on_event("startup")
async def startup_event():
    await update_subscription_statuses()
    
    # Create default admin user if no users exist
    user_count = await db.users.count_documents({})
    if user_count == 0:
        default_admin = User(
            username="admin",
            email="admin@afrikanet.com",
            full_name="Administrateur",
            hashed_password=get_password_hash("admin123"),
            is_active=True
        )
        await db.users.insert_one(default_admin.dict())
        logging.info("Default admin user created: admin/admin123")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()