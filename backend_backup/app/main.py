from urllib import request
from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from jose import jwt
from fastapi import Depends, HTTPException
from datetime import date
from fastapi import HTTPException, Depends
from uuid import uuid4
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, Literal

from app.database import get_db_connection

class UserRegistration(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

app = FastAPI(
    title="CarParts API",
    description="Backend API for the CarParts e-commerce platform",
    version="1.0.0"
)

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

SECRET_KEY = "carparts-super-secret-key-chsnge-this-later"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("sub")
        email = payload.get("email")
        role = payload.get("role")

        if user_id is None or email is None or role is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token"
            )

        return {
            "user_id": user_id,
            "email": email,
            "role": role
        }

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token"
        )

def require_role(*allowed_roles):
    def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to perform this action"
            )

        return current_user

    return role_checker

@app.get("/")
def root():
    return {
        "message": "Welcome to CarParts API",
        "status": "running"
    }


@app.get("/health")
def health():
    return {
        "status": "ok"
    }


@app.get("/database-test")
def database_test():
    connection = None

    try:
        connection = get_db_connection()

        cursor = connection.cursor()
        cursor.execute("SELECT current_database();")
        database_name = cursor.fetchone()[0]
        cursor.close()

        return {
            "status": "connected",
            "database": database_name
        }

    except Exception as error:
        return {
            "status": "error",
            "message": str(error)
        }

    finally:
        if connection:
            connection.close()


@app.get("/products")
def get_products():
    connection = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        query = """
            SELECT
                p.id,
                p.name,
                p.description,
                c.name AS category,
                b.name AS brand,
                p.part_number,
                p.sku,
                p.price,
                p.stock_quantity,
                p.image_url,
                p.is_active
            FROM products p
            JOIN categories c
                ON p.category_id = c.id
            LEFT JOIN brands b
                ON p.brand_id = b.id
            WHERE p.is_active = TRUE
            ORDER BY p.id;
        """

        cursor.execute(query)

        rows = cursor.fetchall()

        products = []

        for row in rows:
            products.append({
                "id": row[0],
                "name": row[1],
                "description": row[2],
                "category": row[3],
                "brand": row[4],
                "part_number": row[5],
                "sku": row[6],
                "price": float(row[7]),
                "stock_quantity": row[8],
                "image_url": row[9],
                "is_active": row[10]
            })

        cursor.close()

        return {
            "count": len(products),
            "products": products
        }

    except Exception as error:
        return {
            "status": "error",
            "message": str(error)
        }

    finally:
        if connection:
            connection.close()


@app.get("/categories")
def get_categories():
    connection = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        query = """
            SELECT
                id,
                name,
                description,
                image_url
            FROM categories
            ORDER BY id;
        """

        cursor.execute(query)

        rows = cursor.fetchall()

        categories = []

        for row in rows:
            categories.append({
                "id": row[0],
                "name": row[1],
                "description": row[2],
                "image_url": row[3]
            })

        cursor.close()

        return {
            "count": len(categories),
            "categories": categories
        }

    except Exception as error:
        return {
            "status": "error",
            "message": str(error)
        }

    finally:
        if connection:
            connection.close()


@app.get("/brands")
def get_brands():
    connection = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        query = """
            SELECT
                id,
                name,
                description,
                logo_url
            FROM brands
            ORDER BY id;
        """

        cursor.execute(query)

        rows = cursor.fetchall()

        brands = []

        for row in rows:
            brands.append({
                "id": row[0],
                "name": row[1],
                "description": row[2],
                "logo_url": row[3]
            })

        cursor.close()

        return {
            "count": len(brands),
            "brands": brands
        }

    except Exception as error:
        return {
            "status": "error",
            "message": str(error)
        }

    finally:
        if connection:
            connection.close()


class ProductCreate(BaseModel):
    name: str
    description: str | None = None
    category_id: int
    brand_id: int | None = None
    part_number: str | None = None
    sku: str | None = None
    price: float
    stock_quantity: int = 0
    image_url: str | None = None

class StockInRequest(BaseModel):
    product_id: int
    quantity: int
    reorder_level: int = 5
    notes: str | None = None

class StockOutRequest(BaseModel):
    product_id: int
    quantity: int
    notes: str | None = None

class InventoryReserveRequest(BaseModel):
    product_id: int
    quantity: int
    reference_id: str | None = None
    notes: str | None = None

class InventoryReleaseRequest(BaseModel):
    product_id: int
    quantity: int
    reference_id: str | None = None
    notes: str | None = None

class InventoryAdjustmentRequest(BaseModel):
    product_id: int
    new_quantity: int
    reference_id: str | None = None
    notes: str

class CartItemRequest(BaseModel):
    product_id: int
    quantity: int

class AddressRequest(BaseModel):
    full_name: str
    phone: str
    address_line_1: str
    address_line_2: str | None = None
    city: str
    county: str | None = None
    postal_code: str | None = None
    country: str = "Kenya"
    is_default: bool = False

class DepositPaymentRequest(BaseModel):
    order_id: int
    amount: Decimal
    reference: str
    payment_date: date
    payment_proof_url: str | None = None
    notes: str | None = None

class CheckoutRequest(BaseModel):
    address_id: int
    payment_plan: Literal["DEPOSIT", "FULL"]

class PaymentSubmissionRequest(BaseModel):
    order_id: int
    amount: Decimal
    reference: str
    method: str = "BANK_TRANSFER"
    notes: Optional[str] = None

class PaymentVerificationRequest(BaseModel):
    notes: Optional[str] = None

class PaymentRejectionRequest(BaseModel):
    notes: str

class UserRegistration(BaseModel):
    name: str
    email: str
    password: str

@app.post("/products")
def create_product(
    product: ProductCreate,
    current_user: dict = Depends(
        require_role("STAFF", "ADMIN", "OWNER")
    )
):
    connection = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        query = """
            INSERT INTO products
            (
                name,
                description,
                category_id,
                brand_id,
                part_number,
                sku,
                price,
                stock_quantity,
                image_url
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id;
        """

        cursor.execute(
            query,
            (
                product.name,
                product.description,
                product.category_id,
                product.brand_id,
                product.part_number,
                product.sku,
                product.price,
                product.stock_quantity,
                product.image_url
            )
        )

        product_id = cursor.fetchone()[0]

        connection.commit()
        cursor.close()

        return {
            "status": "success",
            "message": "Product created successfully",
            "product_id": product_id
        }

    except Exception as error:
        if connection:
            connection.rollback()

        return {
            "status": "error",
            "message": str(error)
        }

    finally:
        if connection:
            connection.close()


@app.put("/products/{product_id}")
def update_product(
    product_id: int, 
    product: ProductCreate,
    current_user: dict = Depends(
        require_role("STAFF", "ADMIN", "OWNER")
    )
):
    connection = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        query = """
            UPDATE products
            SET
                name = %s,
                description = %s,
                category_id = %s,
                brand_id = %s,
                part_number = %s,
                sku = %s,
                price = %s,
                stock_quantity = %s,
                image_url = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING id;
        """

        cursor.execute(
            query,
            (
                product.name,
                product.description,
                product.category_id,
                product.brand_id,
                product.part_number,
                product.sku,
                product.price,
                product.stock_quantity,
                product.image_url,
                product_id
            )
        )

        updated_product = cursor.fetchone()

        if updated_product is None:
            cursor.close()

            return {
                "status": "error",
                "message": "Product not found"
            }

        connection.commit()
        cursor.close()

        return {
            "status": "success",
            "message": "Product updated successfully",
            "product_id": updated_product[0]
        }

    except Exception as error:
        if connection:
            connection.rollback()

        return {
            "status": "error",
            "message": str(error)
        }

    finally:
        if connection:
            connection.close()

@app.delete("/products/{product_id}")
def delete_product(
    product_id: int,
    current_user: dict = Depends(
        require_role("STAFF", "ADMIN", "OWNER")
    )
):
    connection = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        query = """
            DELETE FROM products
            WHERE id = %s
            RETURNING id;
        """

        cursor.execute(query, (product_id,))

        deleted_product = cursor.fetchone()

        if deleted_product is None:
            cursor.close()

            return {
                "status": "error",
                "message": "Product not found"
            }

        connection.commit()
        cursor.close()

        return {
            "status": "success",
            "message": "Product deleted successfully",
            "product_id": deleted_product[0]
        }

    except Exception as error:
        if connection:
            connection.rollback()

        return {
            "status": "error",
            "message": str(error)
        }

    finally:
        if connection:
            connection.close()


@app.post("/register")
def register_user(user: UserRegistration):
    connection = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()


        cursor.execute(
            "SELECT id FROM users WHERE email = %s;",
            (user.email,)
        )

        existing_user = cursor.fetchone()

        if existing_user:
            cursor.close()

            return {
                "status": "error",
                "message": "Email is already registered"
            }

        # Hash the password
        password_hash = pwd_context.hash(user.password)

        query = """
            INSERT INTO users
            (
                name,
                email,
                password_hash
            )
            VALUES (%s, %s, %s)
            RETURNING id;
        """

        cursor.execute(
            query,
            (
                user.name,
                user.email,
                password_hash
            )
        )

        user_id = cursor.fetchone()[0]

        connection.commit()
        cursor.close()

        return {
            "status": "success",
            "message": "User registered successfully",
            "user_id": user_id
        }

    except Exception as error:
        if connection:
            connection.rollback()

        return {
            "status": "error",
            "message": str(error)
        }

    finally:
        if connection:
            connection.close()

@app.post("/login")
def login_user(user: UserLogin):
    connection = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()


        cursor.execute(
            """
            SELECT id, name, email, password_hash, role
            FROM users
            WHERE email = %s;
            """,
            (user.email,)
        )

        existing_user = cursor.fetchone()

        if not existing_user:
            cursor.close()

            return {
                "status": "error",
                "message": "Invalid email or password"
            }

        user_id, name, email, password_hash, role = existing_user


        password_correct = pwd_context.verify(
            user.password,
            password_hash
        )

        if not password_correct:
            cursor.close()

            return {
                "status": "error",
                "message": "Invalid email or password"
            }


        expiration = datetime.now(timezone.utc) + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
         
        token_data = {
            "sub": str(user_id),
            "email": email,
            "role": role,
            "exp": expiration,
  
        }

        access_token = jwt.encode(
            token_data,
            SECRET_KEY,
            algorithm=ALGORITHM
        )

        cursor.close()

        return {
            "status": "success",
            "message": "Login successful",
            "access_token": access_token,
            "token_type": "bearer",
            "role": role
        }

    except Exception as error:
        if connection:
            connection.rollback()

        return {
            "status": "error",
            "message": str(error)
        }

    finally:
        if connection:
            connection.close()

@app.get("/profile")
def get_get_profile(current_user: dict = Depends(get_current_user)):
    return {
        "status": "success",
        "message": "You are authenticated",
        "user": current_user
    }


@app.get("/inventory")
def get_inventory(
    current_user: dict = Depends(require_role("STAFF", "ADMIN", "OWNER"))
):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                i.id,
                i.product_id,
                p.name AS product_name,
                p.sku,
                i.quantity,
                i.reserved_quantity,
                (i.quantity - i.reserved_quantity) AS available_quantity,
                i.reorder_level,
                i.updated_at
            FROM inventory i
            JOIN products p ON p.id = i.product_id
            ORDER BY i.id;
        """)

        rows = cursor.fetchall()

        inventory = []

        for row in rows:
            inventory.append({
                "id": row[0],
                "product_id": row[1],
                "product_name": row[2],
                "sku": row[3],
                "quantity": row[4],
                "reserved_quantity": row[5],
                "available_quantity": row[6],
                "reorder_level": row[7],
                "updated_at": row[8]
            })

        return {
            "status": "success",
            "count": len(inventory),
            "inventory": inventory
        }

    finally:
        cursor.close()
        conn.close()

#INVENTORY INNITIALIZATION
@app.post("/inventory/initialize/{product_id}")
def initialize_inventory(
    product_id: int,
    current_user: dict = Depends(
        require_role("STAFF", "ADMIN", "OWNER")
    )
):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Check that the product exists
        cursor.execute("""
            SELECT id, name, stock_quantity
            FROM products
            WHERE id = %s;
        """, (product_id,))

        product = cursor.fetchone()

        if not product:
            raise HTTPException(
                status_code=404,
                detail="Product not found"
            )

        product_id_db = product[0]
        product_name = product[1]
        stock_quantity = product[2]

        # Check whether inventory already exists
        cursor.execute("""
            SELECT id
            FROM inventory
            WHERE product_id = %s;
        """, (product_id,))

        existing_inventory = cursor.fetchone()

        if existing_inventory:
            raise HTTPException(
                status_code=409,
                detail="Inventory already exists for this product"
            )

        # Create inventory record
        cursor.execute("""
            INSERT INTO inventory (
                product_id,
                quantity,
                reserved_quantity,
                reorder_level
            )
            VALUES (%s, %s, 0, 5)
            RETURNING id;
        """, (
            product_id_db,
            stock_quantity
        ))

        inventory_id = cursor.fetchone()[0]

        # Record opening inventory transaction
        if stock_quantity > 0:
            cursor.execute("""
                INSERT INTO inventory_transactions (
                    inventory_id,
                    product_id,
                    transaction_type,
                    quantity,
                    previous_quantity,
                    new_quantity,
                    previous_reserved_quantity,
                    new_reserved_quantity,
                    reference_id,
                    notes,
                    created_by
                )
                VALUES (
                    %s,
                    %s,
                    'STOCK_IN',
                    %s,
                    0,
                    %s,
                    0,
                    0,
                    %s,
                    %s,
                    %s
                );
            """, (
                inventory_id,
                product_id_db,
                stock_quantity,
                stock_quantity,
                f"INITIAL-{product_id_db}",
                "Initial inventory migration from products.stock_quantity",
                current_user["user_id"]
            ))

        conn.commit()

        return {
            "status": "success",
            "message": "Inventory initialized successfully",
            "inventory": {
                "inventory_id": inventory_id,
                "product_id": product_id_db,
                "product_name": product_name,
                "quantity": stock_quantity,
                "reserved_quantity": 0,
                "available_quantity": stock_quantity,
                "reorder_level": 5
            }
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to initialize inventory"
        )

    finally:
        cursor.close()
        conn.close()


# INVENTORY STOCK IN
@app.post("/inventory/stock-in")
def stock_in(
    request: StockInRequest,
    current_user: dict = Depends(
        require_role("STAFF", "ADMIN", "OWNER")
    )
):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 1. Validate quantity
        if request.quantity <= 0:
            raise HTTPException(
                status_code=400,
                detail="Stock quantity must be greater than zero"
            )
        # 2. Check that the product exists
        cursor.execute("""
            SELECT id, name, sku
            FROM products
            WHERE id = %s;
        """, (request.product_id,))

        product = cursor.fetchone()

        if not product:
            raise HTTPException(
                status_code=404,
                detail="Product not found"
            )

        product_id = product[0]
        product_name = product[1]
        sku = product[2]
        # 3. Lock the inventory row
        cursor.execute("""
            SELECT
                id,
                quantity,
                reserved_quantity,
                reorder_level
            FROM inventory
            WHERE product_id = %s
            FOR UPDATE;
        """, (product_id,))

        inventory = cursor.fetchone()

        if not inventory:
            raise HTTPException(
                status_code=404,
                detail="Inventory record not found for this product"
            )

        inventory_id = inventory[0]
        previous_quantity = inventory[1]
        previous_reserved_quantity = inventory[2]
        current_reorder_level = inventory[3]

        # 4. Calculate new quantity
        new_quantity = previous_quantity + request.quantity

        # 5. Prevent invalid inventory state
        if new_quantity < previous_reserved_quantity:
            raise HTTPException(
                status_code=409,
                detail="New stock quantity cannot be below reserved quantity"
            )
        
        # 6. Determine reorder level

        new_reorder_level = request.reorder_level

        # 7. Update inventory
        cursor.execute("""
            UPDATE inventory
            SET
                quantity = %s,
                reorder_level = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s;
        """, (
            new_quantity,
            new_reorder_level,
            inventory_id
        ))

        # 8. Record inventory transaction
        cursor.execute("""
            INSERT INTO inventory_transactions (
                inventory_id,
                product_id,
                transaction_type,
                quantity,
                previous_quantity,
                new_quantity,
                previous_reserved_quantity,
                new_reserved_quantity,
                reference_id,
                notes,
                created_by
            )
            VALUES (
                %s,
                %s,
                'STOCK_IN',
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
            RETURNING id;
        """, (
            inventory_id,
            product_id,
            request.quantity,
            previous_quantity,
            new_quantity,
            previous_reserved_quantity,
            previous_reserved_quantity,
            None,
            request.notes,
            current_user["user_id"]
        ))

        transaction_id = cursor.fetchone()[0]

        # 9. Commit everything
        conn.commit()

        # 10. Return result
        return {
            "status": "success",
            "message": "Stock added successfully",
            "product": {
                "id": product_id,
                "name": product_name,
                "sku": sku
            },
            "inventory": {
                "inventory_id": inventory_id,
                "previous_quantity": previous_quantity,
                "added_quantity": request.quantity,
                "new_quantity": new_quantity,
                "reserved_quantity": previous_reserved_quantity,
                "available_quantity": (
                    new_quantity - previous_reserved_quantity
                ),
                "reorder_level": new_reorder_level
            },
            "transaction_id": transaction_id,
            "performed_by": current_user["user_id"]
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception:
        conn.rollback()

        raise HTTPException(
            status_code=500,
            detail="Failed to add stock"
        )

    finally:
        cursor.close()
        conn.close()

# INVENTORY TRANSACTION HISTORY
@app.get("/inventory/transactions")
def get_inventory_transactions(
    current_user: dict = Depends(
        require_role("STAFF", "ADMIN", "OWNER")
    )
):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                t.id,
                t.product_id,
                p.name AS product_name,
                p.sku,
                t.transaction_type,
                t.quantity,
                t.previous_quantity,
                t.new_quantity,
                t.previous_reserved_quantity,
                t.new_reserved_quantity,
                t.reference_id,
                t.notes,
                t.created_by,
                u.email AS created_by_email,
                t.created_at
            FROM inventory_transactions t
            JOIN products p
                ON p.id = t.product_id
            LEFT JOIN users u
                ON u.id = t.created_by
            ORDER BY t.created_at DESC, t.id DESC;
        """)

        rows = cursor.fetchall()

        transactions = []

        for row in rows:
            transactions.append({
                "id": row[0],
                "product_id": row[1],
                "product_name": row[2],
                "sku": row[3],
                "transaction_type": row[4],
                "quantity": row[5],
                "previous_quantity": row[6],
                "new_quantity": row[7],
                "previous_reserved_quantity": row[8],
                "new_reserved_quantity": row[9],
                "reference_id": row[10],
                "notes": row[11],
                "created_by": row[12],
                "created_by_email": row[13],
                "created_at": row[14]
            })

        return {
            "status": "success",
            "count": len(transactions),
            "transactions": transactions
        }

    finally:
        cursor.close()
        conn.close()

# INVENTORY STOCK OUT
@app.post("/inventory/stock-out")
def stock_out(
    request: StockOutRequest,
    current_user: dict = Depends(
        require_role("STAFF", "ADMIN", "OWNER")
    )
):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 1. Validate requested quantity
        if request.quantity <= 0:
            raise HTTPException(
                status_code=400,
                detail="Stock quantity must be greater than zero"
            )

        # 2. Check that the product exists
        cursor.execute("""
            SELECT id, name, sku
            FROM products
            WHERE id = %s;
        """, (request.product_id,))

        product = cursor.fetchone()

        if not product:
            raise HTTPException(
                status_code=404,
                detail="Product not found"
            )

        product_id = product[0]
        product_name = product[1]
        sku = product[2]

        # 3. Lock inventory row
        cursor.execute("""
            SELECT
                id,
                quantity,
                reserved_quantity,
                reorder_level
            FROM inventory
            WHERE product_id = %s
            FOR UPDATE;
        """, (product_id,))

        inventory = cursor.fetchone()

        if not inventory:
            raise HTTPException(
                status_code=404,
                detail="Inventory record not found for this product"
            )

        inventory_id = inventory[0]
        previous_quantity = inventory[1]
        previous_reserved_quantity = inventory[2]
        reorder_level = inventory[3]

        # 4. Calculate available stock
        available_quantity = (
            previous_quantity - previous_reserved_quantity
        )

        # 5. Prevent removing more stock than is available
        if request.quantity > available_quantity:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "Insufficient available stock",
                    "requested_quantity": request.quantity,
                    "available_quantity": available_quantity
                }
            )

        # 6. Calculate new quantity
        new_quantity = previous_quantity - request.quantity

        # 7. Safety check
        if new_quantity < 0:
            raise HTTPException(
                status_code=409,
                detail="Inventory quantity cannot become negative"
            )

        # 8. Update inventory
        cursor.execute("""
            UPDATE inventory
            SET
                quantity = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s;
        """, (
            new_quantity,
            inventory_id
        ))

        # 9. Record transaction
        cursor.execute("""
            INSERT INTO inventory_transactions (
                inventory_id,
                product_id,
                transaction_type,
                quantity,
                previous_quantity,
                new_quantity,
                previous_reserved_quantity,
                new_reserved_quantity,
                reference_id,
                notes,
                created_by
            )
            VALUES (
                %s,
                %s,
                'STOCK_OUT',
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
            RETURNING id;
        """, (
            inventory_id,
            product_id,
            request.quantity,
            previous_quantity,
            new_quantity,
            previous_reserved_quantity,
            previous_reserved_quantity,
            None,
            request.notes,
            current_user["user_id"]
        ))

        transaction_id = cursor.fetchone()[0]

        # 10. Commit
        conn.commit()

        # 11. Return result
        new_available_quantity = (
            new_quantity - previous_reserved_quantity
        )

        return {
            "status": "success",
            "message": "Stock removed successfully",
            "product": {
                "id": product_id,
                "name": product_name,
                "sku": sku
            },
            "inventory": {
                "inventory_id": inventory_id,
                "previous_quantity": previous_quantity,
                "removed_quantity": request.quantity,
                "new_quantity": new_quantity,
                "reserved_quantity": previous_reserved_quantity,
                "available_quantity": new_available_quantity,
                "reorder_level": reorder_level
            },
            "transaction_id": transaction_id,
            "performed_by": current_user["user_id"]
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception:
        conn.rollback()

        raise HTTPException(
            status_code=500,
            detail="Failed to remove stock"
        )

    finally:
        cursor.close()
        conn.close()

# INVENTORY RESERVATION

@app.post("/inventory/reserve")
def reserve_inventory(
    request: InventoryReserveRequest,
    current_user: dict = Depends(
        require_role("STAFF", "ADMIN", "OWNER")
    )
):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 1. Validate quantity

        if request.quantity <= 0:
            raise HTTPException(
                status_code=400,
                detail="Reservation quantity must be greater than zero"
            )

        # 2. Check product

        cursor.execute("""
            SELECT id, name, sku
            FROM products
            WHERE id = %s;
        """, (request.product_id,))

        product = cursor.fetchone()

        if not product:
            raise HTTPException(
                status_code=404,
                detail="Product not found"
            )

        product_id = product[0]
        product_name = product[1]
        sku = product[2]

        # 3. Lock inventory row

        cursor.execute("""
            SELECT
                id,
                quantity,
                reserved_quantity,
                reorder_level
            FROM inventory
            WHERE product_id = %s
            FOR UPDATE;
        """, (product_id,))

        inventory = cursor.fetchone()

        if not inventory:
            raise HTTPException(
                status_code=404,
                detail="Inventory record not found for this product"
            )

        inventory_id = inventory[0]
        current_quantity = inventory[1]
        previous_reserved_quantity = inventory[2]
        reorder_level = inventory[3]

        # 4. Calculate available stock

        available_quantity = (
            current_quantity - previous_reserved_quantity
        )
        # 5. Check available stock

        if request.quantity > available_quantity:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "Insufficient available stock for reservation",
                    "requested_quantity": request.quantity,
                    "available_quantity": available_quantity
                }
            )
        # 6. Calculate new reserved quantity

        new_reserved_quantity = (
            previous_reserved_quantity + request.quantity
        )

        # 7. Update inventory

        cursor.execute("""
            UPDATE inventory
            SET
                reserved_quantity = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s;
        """, (
            new_reserved_quantity,
            inventory_id
        ))

        # 8. Record transaction

        cursor.execute("""
            INSERT INTO inventory_transactions (
                inventory_id,
                product_id,
                transaction_type,
                quantity,
                previous_quantity,
                new_quantity,
                previous_reserved_quantity,
                new_reserved_quantity,
                reference_id,
                notes,
                created_by
            )
            VALUES (
                %s,
                %s,
                'RESERVATION',
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
            RETURNING id;
        """, (
            inventory_id,
            product_id,
            request.quantity,
            current_quantity,
            current_quantity,
            previous_reserved_quantity,
            new_reserved_quantity,
            request.reference_id,
            request.notes,
            current_user["user_id"]
        ))

        transaction_id = cursor.fetchone()[0]

        # 9. Commit

        conn.commit()

        # 10. Calculate new available stock

        new_available_quantity = (
            current_quantity - new_reserved_quantity
        )

        return {
            "status": "success",
            "message": "Inventory reserved successfully",
            "product": {
                "id": product_id,
                "name": product_name,
                "sku": sku
            },
            "inventory": {
                "inventory_id": inventory_id,
                "quantity": current_quantity,
                "previous_reserved_quantity": previous_reserved_quantity,
                "reserved_quantity": new_reserved_quantity,
                "available_quantity": new_available_quantity,
                "reorder_level": reorder_level
            },
            "reservation": {
                "quantity": request.quantity,
                "reference_id": request.reference_id
            },
            "transaction_id": transaction_id,
            "performed_by": current_user["user_id"]
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception:
        conn.rollback()

        raise HTTPException(
            status_code=500,
            detail="Failed to reserve inventory"
        )

    finally:
        cursor.close()
        conn.close()

@app.post("/inventory/release")
def release_inventory(
    request: InventoryReleaseRequest,
    current_user: dict = Depends(require_role("STAFF", "ADMIN", "OWNER"))
):
    if request.quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Quantity must be greater than zero"
        )

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 1. Check that the product exists
        cursor.execute(
            """
            SELECT id, name, sku
            FROM products
            WHERE id = %s
            """,
            (request.product_id,)
        )

        product = cursor.fetchone()

        if not product:
            raise HTTPException(
                status_code=404,
                detail="Product not found"
            )

        # 2. Lock the inventory row
        cursor.execute(
            """
            SELECT
                id,
                quantity,
                reserved_quantity,
                reorder_level
            FROM inventory
            WHERE product_id = %s
            FOR UPDATE
            """,
            (request.product_id,)
        )

        inventory = cursor.fetchone()

        if not inventory:
            raise HTTPException(
                status_code=404,
                detail="Inventory record not found for this product"
            )

        inventory_id = inventory[0]
        current_quantity = inventory[1]
        current_reserved = inventory[2]
        reorder_level = inventory[3]

        # 3. Make sure we don't release more than reserved
        if request.quantity > current_reserved:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "Cannot release more inventory than currently reserved",
                    "requested_quantity": request.quantity,
                    "reserved_quantity": current_reserved
                }
            )

        # 4. Calculate new reservation
        new_reserved = current_reserved - request.quantity

        # Physical stock does NOT change
        new_quantity = current_quantity

        # Available stock increases
        new_available = new_quantity - new_reserved

        # 5. Update inventory
        cursor.execute(
            """
            UPDATE inventory
            SET
                reserved_quantity = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            """,
            (
                new_reserved,
                inventory_id
            )
        )

        # 6. Record inventory transaction
        cursor.execute(
            """
            INSERT INTO inventory_transactions (
                inventory_id,
                product_id,
                transaction_type,
                quantity,
                previous_quantity,
                new_quantity,
                previous_reserved_quantity,
                new_reserved_quantity,
                reference_id,
                notes,
                created_by
            )
            VALUES (
                %s,
                %s,
                'RELEASE',
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
            RETURNING id
            """,
            (
                inventory_id,
                request.product_id,
                request.quantity,
                current_quantity,
                new_quantity,
                current_reserved,
                new_reserved,
                request.reference_id,
                request.notes,
                current_user["user_id"]
            )
        )

        transaction_id = cursor.fetchone()[0]

        # 7. Commit transaction
        conn.commit()

        return {
            "status": "success",
            "message": "Inventory reservation released successfully",
            "transaction_id": transaction_id,
            "product": {
                "id": product[0],
                "name": product[1],
                "sku": product[2]
            },
            "inventory": {
                "quantity": new_quantity,
                "reserved_quantity": new_reserved,
                "available_quantity": new_available,
                "reorder_level": reorder_level
            }
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to release inventory reservation: {str(e)}"
        )

    finally:
        cursor.close()
        conn.close()

# INVENTORY ADJUSTMENT

@app.post("/inventory/adjustment")
def adjust_inventory(
    request: InventoryAdjustmentRequest,
    current_user: dict = Depends(
        require_role("STAFF", "ADMIN", "OWNER")
    )
):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:

        # 1. Validate new quantity
        if request.new_quantity < 0:
            raise HTTPException(
                status_code=400,
                detail="New inventory quantity cannot be negative"
            )
        
        # 2. Find product

        cursor.execute("""
            SELECT id, name, sku
            FROM products
            WHERE id = %s;
        """, (request.product_id,))

        product = cursor.fetchone()

        if not product:
            raise HTTPException(
                status_code=404,
                detail="Product not found"
            )

        product_id = product[0]
        product_name = product[1]
        sku = product[2]

        # 3. Lock inventory row

        cursor.execute("""
            SELECT
                id,
                quantity,
                reserved_quantity,
                reorder_level
            FROM inventory
            WHERE product_id = %s
            FOR UPDATE;
        """, (product_id,))

        inventory = cursor.fetchone()

        if not inventory:
            raise HTTPException(
                status_code=404,
                detail="Inventory record not found for this product"
            )

        inventory_id = inventory[0]
        previous_quantity = inventory[1]
        reserved_quantity = inventory[2]
        reorder_level = inventory[3]

        # 4. Cannot adjust below reserved stock

        if request.new_quantity < reserved_quantity:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "New quantity cannot be less than reserved quantity",
                    "new_quantity": request.new_quantity,
                    "reserved_quantity": reserved_quantity
                }
            )

        # 5. Calculate adjustment

        adjustment_quantity = (
            request.new_quantity - previous_quantity
        )

        # 6. No-change protection
        if adjustment_quantity == 0:
            raise HTTPException(
                status_code=409,
                detail="Adjustment would not change inventory quantity"
            )

        # 7. Update inventory

        cursor.execute("""
            UPDATE inventory
            SET
                quantity = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s;
        """, (
            request.new_quantity,
            inventory_id
        ))

        # 8. Record adjustment transaction

        cursor.execute("""
            INSERT INTO inventory_transactions (
                inventory_id,
                product_id,
                transaction_type,
                quantity,
                previous_quantity,
                new_quantity,
                previous_reserved_quantity,
                new_reserved_quantity,
                reference_id,
                notes,
                created_by
            )
            VALUES (
                %s,
                %s,
                'ADJUSTMENT',
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
            RETURNING id;
        """, (
            inventory_id,
            product_id,
            abs(adjustment_quantity),
            previous_quantity,
            request.new_quantity,
            reserved_quantity,
            reserved_quantity,
            request.reference_id,
            request.notes,
            current_user["user_id"]
        ))

        transaction_id = cursor.fetchone()[0]

        # 9. Commit

        conn.commit()

        # 10. Calculate available quantity

        available_quantity = (
            request.new_quantity - reserved_quantity
        )

        return {
            "status": "success",
            "message": "Inventory adjusted successfully",
            "product": {
                "id": product_id,
                "name": product_name,
                "sku": sku
            },
            "inventory": {
                "inventory_id": inventory_id,
                "previous_quantity": previous_quantity,
                "adjustment_quantity": adjustment_quantity,
                "new_quantity": request.new_quantity,
                "reserved_quantity": reserved_quantity,
                "available_quantity": available_quantity,
                "reorder_level": reorder_level
            },
            "transaction_id": transaction_id,
            "performed_by": current_user["user_id"]
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()

        print("INVENTORY ADJUSTMENT ERROR:", str(e))  # Log the error for debugging

        raise HTTPException(
            status_code=500,
            detail="Failed to adjust inventory"
        )

    finally:
        cursor.close()
        conn.close()

# CART - GET ACTIVE CART

@app.get("/cart")
def get_cart(
    current_user: dict = Depends(
        require_role("CUSTOMER", "STAFF", "ADMIN", "OWNER")
    )
):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        user_id = int(current_user["user_id"])

        # Find active cart
        cursor.execute("""
            SELECT
                id,
                status,
                created_at,
                updated_at
            FROM carts
            WHERE user_id = %s
              AND status = 'ACTIVE'
            LIMIT 1;
        """, (user_id,))

        cart = cursor.fetchone()

        # Create cart if one does not exist
        if not cart:
            cursor.execute("""
                INSERT INTO carts (
                    user_id,
                    status
                )
                VALUES (%s, 'ACTIVE')
                RETURNING
                    id,
                    status,
                    created_at,
                    updated_at;
            """, (user_id,))

            cart = cursor.fetchone()
            conn.commit()

        cart_id = cart[0]

        # Get cart items using authoritative inventory data
        cursor.execute("""
            SELECT
                ci.id,
                ci.product_id,
                p.name,
                p.sku,
                p.part_number,
                p.price,
                ci.quantity,
                i.quantity AS inventory_quantity,
                i.reserved_quantity,
                ci.created_at,
                ci.updated_at
            FROM cart_items ci

            JOIN products p
                ON p.id = ci.product_id

            LEFT JOIN inventory i
                ON i.product_id = ci.product_id

            WHERE ci.cart_id = %s

            ORDER BY ci.created_at ASC;
        """, (cart_id,))

        items = cursor.fetchall()

        cart_items = []
        subtotal = 0
        total_quantity = 0

        for item in items:

            item_id = item[0]
            product_id = item[1]
            product_name = item[2]
            sku = item[3]
            part_number = item[4]
            price = item[5]
            quantity = item[6]
            inventory_quantity = item[7]
            reserved_quantity = item[8]
            created_at = item[9]
            updated_at = item[10]

            # Calculate available stock
            if inventory_quantity is None:
                available_stock = 0
            else:
                available_stock = (
                    inventory_quantity - reserved_quantity
                )

            item_total = price * quantity

            subtotal += item_total
            total_quantity += quantity

            # Determine stock status
            if available_stock <= 0:
                stock_status = "OUT_OF_STOCK"

            elif quantity > available_stock:
                stock_status = "INSUFFICIENT_STOCK"

            elif available_stock <= 5:
                stock_status = "LOW_STOCK"

            else:
                stock_status = "IN_STOCK"

            cart_items.append({
                "id": item_id,
                "product_id": product_id,
                "product_name": product_name,
                "sku": sku,
                "part_number": part_number,
                "unit_price": price,
                "quantity": quantity,
                "item_total": item_total,
                "available_stock": available_stock,
                "stock_status": stock_status,
                "created_at": created_at,
                "updated_at": updated_at
            })

        # Determine whether the cart can currently proceed to checkout
        checkout_ready = True

        for item in cart_items:

            if item["stock_status"] in [
                "OUT_OF_STOCK",
                "INSUFFICIENT_STOCK"
            ]:
                checkout_ready = False
                break

        return {
            "status": "success",

            "cart": {
                "id": cart_id,
                "status": cart[1],

                "items": cart_items,

                "item_count": len(cart_items),
                "total_quantity": total_quantity,

                "subtotal": subtotal,

                "checkout_ready": checkout_ready,

                "created_at": cart[2],
                "updated_at": cart[3]
            }
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()

        print("GET CART ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve cart: {str(e)}"
        )

    finally:
        cursor.close()
        conn.close()

@app.post("/cart/items")
def add_to_cart(
    request: CartItemRequest,
    current_user: dict = Depends(
        require_role("CUSTOMER", "STAFF", "ADMIN", "OWNER")
    )
):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        user_id = int(current_user["user_id"])

        # Validate quantity
        if request.quantity <= 0:
            raise HTTPException(
                status_code=400,
                detail="Quantity must be greater than zero"
            )

        # Check product
        cursor.execute("""
            SELECT
                id,
                name,
                sku,
                part_number,
                price,
                stock_quantity,
                is_active
            FROM products
            WHERE id = %s;
        """, (request.product_id,))

        product = cursor.fetchone()

        if not product:
            raise HTTPException(
                status_code=404,
                detail="Product not found"
            )

        product_id = product[0]
        product_name = product[1]
        sku = product[2]
        part_number = product[3]
        price = product[4]
        stock_quantity = product[5]
        is_active = product[6]

        # Prevent inactive products from being added
        if not is_active:
            raise HTTPException(
                status_code=400,
                detail="This product is not currently available"
            )

        # Check inventory
        cursor.execute("""
            SELECT
                quantity,
                reserved_quantity
            FROM inventory
            WHERE product_id = %s;
        """, (product_id,))

        inventory = cursor.fetchone()

        if not inventory:
            raise HTTPException(
                status_code=400,
                detail="Inventory record not found for this product"
            )

        inventory_quantity = inventory[0]
        reserved_quantity = inventory[1]

        available_quantity = inventory_quantity - reserved_quantity

        # Check existing cart item
        cursor.execute("""
            SELECT
                ci.id,
                ci.quantity
            FROM cart_items ci
            JOIN carts c
                ON c.id = ci.cart_id
            WHERE c.user_id = %s
              AND c.status = 'ACTIVE'
              AND ci.product_id = %s;
        """, (user_id, product_id))

        existing_item = cursor.fetchone()

        if existing_item:
            cart_item_id = existing_item[0]
            existing_quantity = existing_item[1]

            new_quantity = existing_quantity + request.quantity

            if new_quantity > available_quantity:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        f"Insufficient stock. "
                        f"Available quantity: {available_quantity}. "
                        f"Already in cart: {existing_quantity}."
                    )
                )

            cursor.execute("""
                UPDATE cart_items
                SET
                    quantity = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING
                    id,
                    cart_id,
                    product_id,
                    quantity,
                    updated_at;
            """, (new_quantity, cart_item_id))

            updated_item = cursor.fetchone()

        else:
            if request.quantity > available_quantity:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        f"Insufficient stock. "
                        f"Available quantity: {available_quantity}."
                    )
                )

            # Find/create active cart
            cursor.execute("""
                SELECT id
                FROM carts
                WHERE user_id = %s
                  AND status = 'ACTIVE'
                LIMIT 1;
            """, (user_id,))

            cart = cursor.fetchone()

            if not cart:
                cursor.execute("""
                    INSERT INTO carts (
                        user_id,
                        status
                    )
                    VALUES (%s, 'ACTIVE')
                    RETURNING id;
                """, (user_id,))

                cart = cursor.fetchone()

            cart_id = cart[0]

            cursor.execute("""
                INSERT INTO cart_items (
                    cart_id,
                    product_id,
                    quantity
                )
                VALUES (%s, %s, %s)
                RETURNING
                    id,
                    cart_id,
                    product_id,
                    quantity,
                    created_at,
                    updated_at;
            """, (
                cart_id,
                product_id,
                request.quantity
            ))

            updated_item = cursor.fetchone()

        conn.commit()

        return {
            "status": "success",
            "message": "Product added to cart successfully",
            "item": {
                "id": updated_item[0],
                "cart_id": updated_item[1],
                "product_id": updated_item[2],
                "product_name": product_name,
                "sku": sku,
                "part_number": part_number,
                "unit_price": price,
                "quantity": updated_item[3],
                "available_stock": available_quantity
            }
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()
        print("ADD TO CART ERROR:", repr(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to add product to cart: {str(e)}"
        )

    finally:
        cursor.close()
        conn.close()

@app.put("/cart/items/{cart_item_id}")
def update_cart_item(
    cart_item_id: int,
    request: CartItemRequest,
    current_user: dict = Depends(
        require_role("CUSTOMER", "STAFF", "ADMIN", "OWNER")
    )
):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        user_id = int(current_user["user_id"])

        # Validate quantity
        if request.quantity <= 0:
            raise HTTPException(
                status_code=400,
                detail="Quantity must be greater than zero"
            )

        # Find the cart item and make sure it belongs
        # to the authenticated user's active cart
        cursor.execute("""
            SELECT
                ci.id,
                ci.cart_id,
                ci.product_id,
                ci.quantity,
                p.name,
                p.sku,
                p.part_number,
                p.price
            FROM cart_items ci
            JOIN carts c
                ON c.id = ci.cart_id
            JOIN products p
                ON p.id = ci.product_id
            WHERE ci.id = %s
              AND c.user_id = %s
              AND c.status = 'ACTIVE';
        """, (cart_item_id, user_id))

        cart_item = cursor.fetchone()

        if not cart_item:
            raise HTTPException(
                status_code=404,
                detail="Cart item not found"
            )

        cart_id = cart_item[1]
        product_id = cart_item[2]

        # Check current inventory
        cursor.execute("""
            SELECT
                quantity,
                reserved_quantity
            FROM inventory
            WHERE product_id = %s;
        """, (product_id,))

        inventory = cursor.fetchone()

        if not inventory:
            raise HTTPException(
                status_code=400,
                detail="Inventory record not found for this product"
            )

        inventory_quantity = inventory[0]
        reserved_quantity = inventory[1]

        available_quantity = inventory_quantity - reserved_quantity

        # Prevent quantity from exceeding available stock
        if request.quantity > available_quantity:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Insufficient stock. "
                    f"Available quantity: {available_quantity}."
                )
            )

        # Update quantity
        cursor.execute("""
            UPDATE cart_items
            SET
                quantity = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING
                id,
                cart_id,
                product_id,
                quantity,
                updated_at;
        """, (
            request.quantity,
            cart_item_id
        ))

        updated_item = cursor.fetchone()

        conn.commit()

        unit_price = cart_item[7]
        item_total = unit_price * updated_item[3]

        return {
            "status": "success",
            "message": "Cart item updated successfully",
            "item": {
                "id": updated_item[0],
                "cart_id": updated_item[1],
                "product_id": updated_item[2],
                "product_name": cart_item[4],
                "sku": cart_item[5],
                "part_number": cart_item[6],
                "unit_price": unit_price,
                "quantity": updated_item[3],
                "item_total": item_total,
                "available_stock": available_quantity,
                "updated_at": updated_item[4]
            }
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()
        print("UPDATE CART ITEM ERROR:", repr(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update cart item: {str(e)}"
        )

    finally:
        cursor.close()
        conn.close()

@app.delete("/cart/items/{cart_item_id}")
def delete_cart_item(
    cart_item_id: int,
    current_user: dict = Depends(
        require_role("CUSTOMER", "STAFF", "ADMIN", "OWNER")
    )
):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        user_id = int(current_user["user_id"])

        # Verify that the cart item belongs to the
        # authenticated user's active cart
        cursor.execute("""
            SELECT
                ci.id,
                ci.cart_id,
                ci.product_id,
                ci.quantity,
                p.name,
                p.sku,
                p.part_number
            FROM cart_items ci
            JOIN carts c
                ON c.id = ci.cart_id
            JOIN products p
                ON p.id = ci.product_id
            WHERE ci.id = %s
              AND c.user_id = %s
              AND c.status = 'ACTIVE';
        """, (cart_item_id, user_id))

        cart_item = cursor.fetchone()

        if not cart_item:
            raise HTTPException(
                status_code=404,
                detail="Cart item not found"
            )

        # Save information before deletion
        product_id = cart_item[2]
        product_name = cart_item[4]
        sku = cart_item[5]
        part_number = cart_item[6]
        quantity = cart_item[3]

        # Delete the item
        cursor.execute("""
            DELETE FROM cart_items
            WHERE id = %s
            RETURNING id;
        """, (cart_item_id,))

        deleted_item = cursor.fetchone()

        conn.commit()

        return {
            "status": "success",
            "message": "Product removed from cart successfully",
            "removed_item": {
                "id": deleted_item[0],
                "product_id": product_id,
                "product_name": product_name,
                "sku": sku,
                "part_number": part_number,
                "quantity": quantity
            }
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()
        print("DELETE CART ITEM ERROR:", repr(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to remove cart item: {str(e)}"
        )

    finally:
        cursor.close()
        conn.close()

@app.post("/checkout")
def checkout(
    request: CheckoutRequest,
    current_user: dict = Depends(get_current_user)
):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        user_id = current_user["user_id"]

        # ============================================================
        # 1. GET ACTIVE CART
        # ============================================================

        cursor.execute(
            """
            SELECT id
            FROM carts
            WHERE user_id = %s
              AND status = 'ACTIVE'
            LIMIT 1
            """,
            (user_id,)
        )

        cart = cursor.fetchone()

        if not cart:
            raise HTTPException(
                status_code=404,
                detail="Active cart not found"
            )

        cart_id = cart[0]

        # ============================================================
        # 2. GET CART ITEMS
        # ============================================================

        cursor.execute(
            """
            SELECT
                ci.id,
                ci.product_id,
                ci.quantity,
                p.name,
                p.sku,
                p.part_number,
                p.price,
                p.stock_quantity,
                p.is_active
            FROM cart_items ci
            JOIN products p
                ON p.id = ci.product_id
            WHERE ci.cart_id = %s
            ORDER BY ci.id
            """,
            (cart_id,)
        )

        cart_items = cursor.fetchall()

        if not cart_items:
            raise HTTPException(
                status_code=400,
                detail="Cart is empty"
            )

        # ============================================================
        # 3. CALCULATE SUBTOTAL
        # ============================================================

        subtotal = Decimal("0.00")

        validated_items = []

        for item in cart_items:

            (
                cart_item_id,
                product_id,
                quantity,
                product_name,
                sku,
                part_number,
                price,
                stock_quantity,
                is_active
            ) = item

            # --------------------------------------------------------
            # Validate product
            # --------------------------------------------------------

            if not is_active:
                raise HTTPException(
                    status_code=400,
                    detail=f"Product '{product_name}' is no longer available"
                )

            # --------------------------------------------------------
            # Validate quantity
            # --------------------------------------------------------

            if quantity <= 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid quantity for product '{product_name}'"
                )

            # --------------------------------------------------------
            # Validate stock
            # --------------------------------------------------------

            if quantity > stock_quantity:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        f"Insufficient stock for '{product_name}'. "
                        f"Available: {stock_quantity}"
                    )
                )

            # --------------------------------------------------------
            # Convert price to Decimal
            # --------------------------------------------------------

            unit_price = Decimal(str(price))

            item_subtotal = (
                unit_price * Decimal(quantity)
            ).quantize(
                Decimal("0.01"),
                rounding=ROUND_HALF_UP
            )

            subtotal += item_subtotal

            validated_items.append(
                {
                    "cart_item_id": cart_item_id,
                    "product_id": product_id,
                    "quantity": quantity,
                    "product_name": product_name,
                    "sku": sku,
                    "part_number": part_number,
                    "unit_price": unit_price,
                    "subtotal": item_subtotal
                }
            )

        subtotal = subtotal.quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP
        )

        # ============================================================
        # 4. VALIDATE SHIPPING ADDRESS
        # ============================================================

        address_id = request.address_id

        cursor.execute(
            """
            SELECT id
            FROM addresses
            WHERE id = %s
              AND user_id = %s
            """,
            (
                address_id,
                user_id
            )
        )

        address = cursor.fetchone()

        if not address:
            raise HTTPException(
                status_code=404,
                detail="Shipping address not found"
            )

        shipping_address_id = address[0]

        # ============================================================
        # 5. DELIVERY + DISCOUNT
        # ============================================================

        # Currently zero until the delivery calculation system is added.
        delivery_fee = Decimal("0.00")

        # Currently zero until coupon/discount functionality is added.
        discount_amount = Decimal("0.00")

        # ============================================================
        # 6. CALCULATE TOTAL
        # ============================================================

        total_amount = (
            subtotal
            + delivery_fee
            - discount_amount
        ).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP
        )

        if total_amount < Decimal("0.00"):
            raise HTTPException(
                status_code=500,
                detail="Invalid order total"
            )

        # ============================================================
        # 7. VALIDATE PAYMENT PLAN
        # ============================================================

        payment_plan = request.payment_plan

        if payment_plan == "DEPOSIT":

            deposit_percentage = Decimal("75.00")
            balance_percentage = Decimal("25.00")

        elif payment_plan == "FULL":

            deposit_percentage = Decimal("100.00")
            balance_percentage = Decimal("0.00")

        else:

            raise HTTPException(
                status_code=400,
                detail="Invalid payment plan"
            )

        # ============================================================
        # 8. CALCULATE DEPOSIT
        # ============================================================

        deposit_amount = (
            total_amount
            * deposit_percentage
            / Decimal("100")
        ).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP
        )

        # ============================================================
        # 9. CALCULATE BALANCE
        # ============================================================

        balance_amount = (
            total_amount
            - deposit_amount
        ).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP
        )

        # ============================================================
        # 10. FINANCIAL INTEGRITY CHECKS
        # ============================================================

        if (
            deposit_percentage
            + balance_percentage
            != Decimal("100.00")
        ):
            raise HTTPException(
                status_code=500,
                detail="Invalid payment percentage configuration"
            )

        if (
            deposit_amount
            + balance_amount
            != total_amount
        ):
            raise HTTPException(
                status_code=500,
                detail="Payment calculation integrity error"
            )

        # ============================================================
        # 11. GENERATE ORDER NUMBER
        # ============================================================

        order_number = (
            f"ORD-{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
        )

        # ============================================================
        # 12. CREATE ORDER
        # ============================================================

        cursor.execute(
            """
            INSERT INTO orders (
                order_number,
                user_id,
                subtotal,
                delivery_fee,
                discount_amount,
                total_amount,
                payment_plan,
                deposit_percentage,
                deposit_amount,
                balance_percentage,
                balance_amount,
                deposit_paid,
                balance_paid,
                payment_status,
                order_status,
                shipping_address_id,
                created_at,
                updated_at
            )
            VALUES (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                FALSE,
                FALSE,
                'PENDING',
                'PENDING_PAYMENT',
                %s,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            RETURNING id
            """,
            (
                order_number,
                user_id,
                subtotal,
                delivery_fee,
                discount_amount,
                total_amount,
                payment_plan,
                deposit_percentage,
                deposit_amount,
                balance_percentage,
                balance_amount,
                shipping_address_id
            )
        )

        order_result = cursor.fetchone()

        if not order_result:
            raise HTTPException(
                status_code=500,
                detail="Failed to create order"
            )

        order_id = order_result[0]

        # ============================================================
        # 13. CREATE ORDER ITEMS
        # ============================================================

        for item in validated_items:

            cursor.execute(
                """
                INSERT INTO order_items (
                    order_id,
                    product_id,
                    product_name,
                    sku,
                    part_number,
                    quantity,
                    unit_price,
                    subtotal,
                    created_at
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    CURRENT_TIMESTAMP
                )
                """,
                (
                    order_id,
                    item["product_id"],
                    item["product_name"],
                    item["sku"],
                    item["part_number"],
                    item["quantity"],
                    item["unit_price"],
                    item["subtotal"]
                )
            )

        # ============================================================
        # 14. RESERVE INVENTORY
        # ============================================================

        for item in validated_items:

            cursor.execute(
                """
                UPDATE inventory
                SET
                    reserved_quantity = reserved_quantity + %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE product_id = %s
                  AND (
                      quantity - reserved_quantity
                  ) >= %s
                """,
                (
                    item["quantity"],
                    item["product_id"],
                    item["quantity"]
                )
            )

            if cursor.rowcount != 1:

                raise HTTPException(
                    status_code=409,
                    detail=(
                        f"Stock conflict for "
                        f"'{item['product_name']}'"
                    )
                )

            # --------------------------------------------------------
            # Inventory transaction
            # --------------------------------------------------------

            cursor.execute(
                """
                INSERT INTO inventory_transactions (
                    product_id,
                    transaction_type,
                    quantity,
                    created_at
                )
                VALUES (
                    %s,
                    'RESERVATION',
                    %s,
                    CURRENT_TIMESTAMP
                )
                """,
                (
                    item["product_id"],
                    item["quantity"]
                )
            )

        # ============================================================
        # 15. CREATE ORDER EVENT
        # ============================================================

        if payment_plan == "DEPOSIT":

            event_message = (
                "Order created. 75% deposit selected."
            )

        else:

            event_message = (
                "Order created. Full payment selected."
            )

        cursor.execute(
            """
            INSERT INTO order_events (
                order_id,
                event_type,
                previous_status,
                new_status,
                message,
                created_by,
                created_at
            )
            VALUES (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                CURRENT_TIMESTAMP
            )
            """,
            (
                order_id,
                "ORDER_CREATED",
                None,
                "PENDING_PAYMENT",
                event_message,
                user_id
            )
        )

        # ============================================================
        # 16. CONVERT CART
        # ============================================================

        cursor.execute(
            """
            UPDATE carts
            SET
                status = 'CONVERTED',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
              AND user_id = %s
              AND status = 'ACTIVE'
            """,
            (
                cart_id,
                user_id
            )
        )

        if cursor.rowcount != 1:

            raise HTTPException(
                status_code=409,
                detail="Cart could not be converted"
            )

        # ============================================================
        # 17. COMMIT TRANSACTION
        # ============================================================

        conn.commit()

        # ============================================================
        # 18. RETURN ORDER
        # ============================================================

        return {
            "success": True,
            "message": "Order created successfully",
            "order": {
                "id": order_id,
                "order_number": order_number,
                "subtotal": str(subtotal),
                "delivery_fee": str(delivery_fee),
                "discount_amount": str(discount_amount),
                "total_amount": str(total_amount),
                "payment_plan": payment_plan,
                "deposit_percentage": str(
                    deposit_percentage
                ),
                "deposit_amount": str(
                    deposit_amount
                ),
                "balance_percentage": str(
                    balance_percentage
                ),
                "balance_amount": str(
                    balance_amount
                ),
                "deposit_paid": False,
                "balance_paid": False,
                "payment_status": "PENDING",
                "order_status": "PENDING_PAYMENT"
            }
        }

    # ================================================================
    # ERROR HANDLING
    # ================================================================

    except HTTPException:

        conn.rollback()
        raise

    except Exception as e:

        import traceback

        conn.rollback()

        print()
        print("==============================================")
        print("             CHECKOUT ERROR")
        print("==============================================")
        print("ERROR TYPE:", type(e).__name__)
        print("ERROR:", repr(e))
        print()
        traceback.print_exc()
        print("==============================================")
        print()

        raise HTTPException(
            status_code=500,
            detail="Checkout failed"
        )

    finally:

        cursor.close()
        conn.close()

@app.post("/checkout/validate")
def validate_checkout(
    current_user: dict = Depends(
        require_role("CUSTOMER", "STAFF", "ADMIN", "OWNER")
    )
):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        user_id = int(current_user["user_id"])

        # 1. Find the customer's active cart

        cursor.execute("""
            SELECT
                id
            FROM carts
            WHERE user_id = %s
              AND status = 'ACTIVE'
            LIMIT 1;
        """, (user_id,))

        cart = cursor.fetchone()

        if not cart:
            raise HTTPException(
                status_code=400,
                detail="No active cart found"
            )

        cart_id = cart[0]

        # 2. Get cart products and authoritative inventory
        cursor.execute("""
            SELECT
                ci.id,
                ci.product_id,
                ci.quantity,

                p.name,
                p.sku,
                p.part_number,
                p.price,
                p.is_active,

                i.quantity AS inventory_quantity,
                i.reserved_quantity

            FROM cart_items ci

            JOIN products p
                ON p.id = ci.product_id

            LEFT JOIN inventory i
                ON i.product_id = ci.product_id

            WHERE ci.cart_id = %s

            ORDER BY ci.id ASC;
        """, (cart_id,))

        items = cursor.fetchall()

        if not items:
            raise HTTPException(
                status_code=400,
                detail="Your cart is empty"
            )

        # 3. Validate each item

        checkout_items = []

        subtotal = 0
        total_quantity = 0

        validation_errors = []

        for item in items:

            cart_item_id = item[0]
            product_id = item[1]
            requested_quantity = item[2]

            product_name = item[3]
            sku = item[4]
            part_number = item[5]
            unit_price = item[6]
            is_active = item[7]

            inventory_quantity = item[8]
            reserved_quantity = item[9]

            # Product must still be active
            if not is_active:
                validation_errors.append({
                    "cart_item_id": cart_item_id,
                    "product_id": product_id,
                    "error": "PRODUCT_UNAVAILABLE",
                    "message": (
                        f"{product_name} is no longer available."
                    )
                })
                continue

            # Inventory record must exist
            if inventory_quantity is None:
                validation_errors.append({
                    "cart_item_id": cart_item_id,
                    "product_id": product_id,
                    "error": "NO_INVENTORY",
                    "message": (
                        f"No inventory record exists for {product_name}."
                    )
                })
                continue

            # Calculate real available stock
            available_stock = (
                inventory_quantity - reserved_quantity
            )

            # Requested quantity cannot exceed available stock
            if requested_quantity > available_stock:

                validation_errors.append({
                    "cart_item_id": cart_item_id,
                    "product_id": product_id,
                    "error": "INSUFFICIENT_STOCK",
                    "message": (
                        f"{product_name}: requested "
                        f"{requested_quantity}, but only "
                        f"{available_stock} available."
                    ),
                    "requested_quantity": requested_quantity,
                    "available_stock": available_stock
                })

                continue

            # Calculate item total
            item_total = unit_price * requested_quantity

            subtotal += item_total
            total_quantity += requested_quantity

            checkout_items.append({
                "cart_item_id": cart_item_id,
                "product_id": product_id,
                "product_name": product_name,
                "sku": sku,
                "part_number": part_number,
                "unit_price": unit_price,
                "quantity": requested_quantity,
                "item_total": item_total,
                "available_stock": available_stock
            })

        # 4. Determine checkout status

        checkout_ready = (
            len(validation_errors) == 0
            and len(checkout_items) > 0
        )

        # No delivery fee yet.
        # We will implement addresses and delivery calculation next.
        delivery_fee = 0

        discount_amount = 0

        total_amount = (
            subtotal
            + delivery_fee
            - discount_amount
        )

        return {
            "status": "success",

            "checkout_ready": checkout_ready,

            "cart_id": cart_id,

            "items": checkout_items,

            "validation_errors": validation_errors,

            "pricing": {
                "subtotal": subtotal,
                "delivery_fee": delivery_fee,
                "discount_amount": discount_amount,
                "total_amount": total_amount
            },

            "summary": {
                "total_items": len(checkout_items),
                "total_quantity": total_quantity
            }
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()

        print(
            "CHECKOUT VALIDATION ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                f"Checkout validation failed: {str(e)}"
            )
        )

    finally:
        cursor.close()
        conn.close()

@app.post("/payments/submit")
def submit_payment(
    request: PaymentSubmissionRequest,
    current_user: dict = Depends(
        require_role("CUSTOMER", "STAFF", "ADMIN", "OWNER")
    )
):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        user_id = int(current_user["user_id"])

        # 1. Validate payment method

        if request.method != "BANK_TRANSFER":
            raise HTTPException(
                status_code=400,
                detail="Only BANK_TRANSFER is currently supported"
            )

        # 2. Validate payment reference

        reference = request.reference.strip()

        if not reference:
            raise HTTPException(
                status_code=400,
                detail="Payment reference is required"
            )

        if len(reference) > 100:
            raise HTTPException(
                status_code=400,
                detail="Payment reference is too long"
            )

        # 3. Validate payment amount

        if request.amount <= Decimal("0"):
            raise HTTPException(
                status_code=400,
                detail="Payment amount must be greater than zero"
            )

        # Normalize amount
        submitted_amount = request.amount.quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP
        )

        # 4. Lock the order

        cursor.execute(
            """
            SELECT
                id,
                order_number,
                user_id,
                total_amount,
                deposit_percentage,
                deposit_amount,
                balance_percentage,
                balance_amount,
                deposit_paid,
                balance_paid,
                payment_status,
                order_status
            FROM orders
            WHERE id = %s
            FOR UPDATE;
            """,
            (request.order_id,)
        )

        order = cursor.fetchone()

        if not order:
            raise HTTPException(
                status_code=404,
                detail="Order not found"
            )

        (
            order_id,
            order_number,
            order_user_id,
            total_amount,
            deposit_percentage,
            deposit_amount,
            balance_percentage,
            balance_amount,
            deposit_paid,
            balance_paid,
            payment_status,
            order_status
        ) = order

        # 5. Ownership check

        if int(order_user_id) != user_id:

            raise HTTPException(
                status_code=403,
                detail="You are not authorized to submit payment for this order"
            )

        # 6. Only deposit payment is currently allowed

        if deposit_paid:
            raise HTTPException(
                status_code=400,
                detail="The deposit for this order has already been verified"
            )

        # 7. Validate order state


        allowed_statuses = [
            "PENDING_PAYMENT",
            "DEPOSIT_SUBMITTED"
        ]

        if order_status not in allowed_statuses:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Payment submission is not allowed while "
                    f"order status is {order_status}"
                )
            )

        # 8. Validate exact deposit amount

        expected_deposit = Decimal(str(deposit_amount)).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP
        )

        if submitted_amount != expected_deposit:

            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid deposit amount. "
                    f"Required deposit amount is {expected_deposit}."
                )
            )

        # 9. Prevent duplicate pending submissions

        cursor.execute(
            """
            SELECT
                id,
                status,
                reference
            FROM payments
            WHERE order_id = %s
              AND type = 'DEPOSIT'
              AND status = 'SUBMITTED'
            FOR UPDATE;
            """,
            (order_id,)
        )

        existing_submission = cursor.fetchone()

        if existing_submission:

            raise HTTPException(
                status_code=409,
                detail=(
                    "A deposit payment is already awaiting verification "
                    "for this order"
                )
            )

        # 10. Prevent duplicate payment reference

        cursor.execute(
            """
            SELECT
                id,
                order_id,
                status
            FROM payments
            WHERE reference = %s
            LIMIT 1;
            """,
            (reference,)
        )

        existing_reference = cursor.fetchone()

        if existing_reference:

            raise HTTPException(
                status_code=409,
                detail="This payment reference has already been submitted"
            )

        # 11. Insert payment record

        cursor.execute(
            """
            INSERT INTO payments (
                order_id,
                user_id,
                type,
                method,
                amount,
                currency,
                reference,
                status,
                submitted_at,
                notes
            )
            VALUES (
                %s,
                %s,
                'DEPOSIT',
                %s,
                %s,
                'KES',
                %s,
                'SUBMITTED',
                CURRENT_TIMESTAMP,
                %s
            )
            RETURNING
                id,
                order_id,
                user_id,
                type,
                method,
                amount,
                currency,
                reference,
                status,
                submitted_at,
                verified_at,
                verified_by,
                notes;
            """,
            (
                order_id,
                user_id,
                request.method,
                submitted_amount,
                reference,
                request.notes
            )
        )

        payment = cursor.fetchone()

        # 12. Update order status

        cursor.execute(
            """
            UPDATE orders
            SET
                order_status = 'DEPOSIT_SUBMITTED',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s;
            """,
            (order_id,)
        )

        # 13. Create order event

        cursor.execute(
            """
            INSERT INTO order_events (
                order_id,
                event_type,
                previous_status,
                new_status,
                message,
                created_by,
                created_at
            )
            VALUES (
                %s,
                'DEPOSIT_SUBMITTED',
                %s,
                'DEPOSIT_SUBMITTED',
                %s,
                %s,
                CURRENT_TIMESTAMP
            );
            """,
            (
                order_id,
                order_status,
                (
                    f"Customer submitted deposit payment of "
                    f"KES {submitted_amount} "
                    f"with reference {reference}"
                ),
                user_id
            )
        )

        # 14. Commit transaction

        conn.commit()

        # 15. Return response

        return {
            "status": "success",
            "message": (
                "Payment submitted successfully. "
                "It is awaiting verification."
            ),
            "payment": {
                "id": payment[0],
                "order_id": payment[1],
                "user_id": payment[2],
                "type": payment[3],
                "method": payment[4],
                "amount": payment[5],
                "currency": payment[6],
                "reference": payment[7],
                "status": payment[8],
                "submitted_at": payment[9],
                "verified_at": payment[10],
                "verified_by": payment[11],
                "notes": payment[12]
            },
            "order": {
                "id": order_id,
                "order_number": order_number,
                "status": "DEPOSIT_SUBMITTED",
                "deposit_amount": deposit_amount,
                "deposit_paid": False,
                "payment_status": payment_status
            }
        }

    except HTTPException:

        conn.rollback()
        raise

    except Exception as e:

        conn.rollback()

        print(
            "SUBMIT PAYMENT ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to submit payment"
        )

    finally:

        cursor.close()
        conn.close()

@app.post("/addresses")
def create_address(
    request: AddressRequest,
    current_user: dict = Depends(
        require_role("CUSTOMER", "STAFF", "ADMIN", "OWNER")
    )
):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        user_id = int(current_user["user_id"])

        # If this address is marked default,
        # remove default status from existing addresses.
        if request.is_default:
            cursor.execute("""
                UPDATE addresses
                SET
                    is_default = FALSE,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s;
            """, (user_id,))

        cursor.execute("""
            INSERT INTO addresses (
                user_id,
                full_name,
                phone,
                address_line_1,
                address_line_2,
                city,
                county,
                postal_code,
                country,
                is_default
            )
            VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s
            )
            RETURNING
                id,
                full_name,
                phone,
                address_line_1,
                address_line_2,
                city,
                county,
                postal_code,
                country,
                is_default,
                created_at,
                updated_at;
        """, (
            user_id,
            request.full_name,
            request.phone,
            request.address_line_1,
            request.address_line_2,
            request.city,
            request.county,
            request.postal_code,
            request.country,
            request.is_default
        ))

        address = cursor.fetchone()

        conn.commit()

        return {
            "status": "success",
            "message": "Address created successfully",
            "address": {
                "id": address[0],
                "full_name": address[1],
                "phone": address[2],
                "address_line_1": address[3],
                "address_line_2": address[4],
                "city": address[5],
                "county": address[6],
                "postal_code": address[7],
                "country": address[8],
                "is_default": address[9],
                "created_at": address[10],
                "updated_at": address[11]
            }
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()

        print("CREATE ADDRESS ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail=f"Failed to create address: {str(e)}"
        )

    finally:
        cursor.close()
        conn.close()

@app.get("/addresses")
def get_addresses(
    current_user: dict = Depends(
        require_role("CUSTOMER", "STAFF", "ADMIN", "OWNER")
    )
):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        user_id = int(current_user["user_id"])

        cursor.execute("""
            SELECT
                id,
                full_name,
                phone,
                address_line_1,
                address_line_2,
                city,
                county,
                postal_code,
                country,
                is_default,
                created_at,
                updated_at
            FROM addresses
            WHERE user_id = %s
            ORDER BY
                is_default DESC,
                created_at DESC;
        """, (user_id,))

        rows = cursor.fetchall()

        addresses = []

        for row in rows:
            addresses.append({
                "id": row[0],
                "full_name": row[1],
                "phone": row[2],
                "address_line_1": row[3],
                "address_line_2": row[4],
                "city": row[5],
                "county": row[6],
                "postal_code": row[7],
                "country": row[8],
                "is_default": row[9],
                "created_at": row[10],
                "updated_at": row[11]
            })

        return {
            "status": "success",
            "count": len(addresses),
            "addresses": addresses
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()

        print("GET ADDRESSES ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve addresses: {str(e)}"
        )

    finally:
        cursor.close()
        conn.close()

@app.put("/addresses/{address_id}")
def update_address(
    address_id: int,
    request: AddressRequest,
    current_user: dict = Depends(
        require_role("CUSTOMER", "STAFF", "ADMIN", "OWNER")
    )
):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        user_id = int(current_user["user_id"])

        # Verify that the address belongs to the
        # authenticated user
        cursor.execute("""
            SELECT id
            FROM addresses
            WHERE id = %s
              AND user_id = %s;
        """, (address_id, user_id))

        existing_address = cursor.fetchone()

        if not existing_address:
            raise HTTPException(
                status_code=404,
                detail="Address not found"
            )

        # If this address is being made default,
        # remove default status from the user's other addresses.
        if request.is_default:
            cursor.execute("""
                UPDATE addresses
                SET
                    is_default = FALSE,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
                  AND id <> %s;
            """, (user_id, address_id))

        # Update the address
        cursor.execute("""
            UPDATE addresses
            SET
                full_name = %s,
                phone = %s,
                address_line_1 = %s,
                address_line_2 = %s,
                city = %s,
                county = %s,
                postal_code = %s,
                country = %s,
                is_default = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
              AND user_id = %s
            RETURNING
                id,
                full_name,
                phone,
                address_line_1,
                address_line_2,
                city,
                county,
                postal_code,
                country,
                is_default,
                created_at,
                updated_at;
        """, (
            request.full_name,
            request.phone,
            request.address_line_1,
            request.address_line_2,
            request.city,
            request.county,
            request.postal_code,
            request.country,
            request.is_default,
            address_id,
            user_id
        ))

        address = cursor.fetchone()

        conn.commit()

        return {
            "status": "success",
            "message": "Address updated successfully",
            "address": {
                "id": address[0],
                "full_name": address[1],
                "phone": address[2],
                "address_line_1": address[3],
                "address_line_2": address[4],
                "city": address[5],
                "county": address[6],
                "postal_code": address[7],
                "country": address[8],
                "is_default": address[9],
                "created_at": address[10],
                "updated_at": address[11]
            }
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()

        print("UPDATE ADDRESS ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail=f"Failed to update address: {str(e)}"
        )

    finally:
        cursor.close()
        conn.close()

@app.delete("/addresses/{address_id}")
def delete_address(
    address_id: int,
    current_user: dict = Depends(
        require_role("CUSTOMER", "STAFF", "ADMIN", "OWNER")
    )
):
    user_id = int(current_user["user_id"])

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Verify that the address belongs to the authenticated user
        cursor.execute(
            """
            SELECT id, is_default
            FROM addresses
            WHERE id = %s
              AND user_id = %s
            """,
            (address_id, user_id)
        )

        address = cursor.fetchone()

        if not address:
            raise HTTPException(
                status_code=404,
                detail="Address not found"
            )

        was_default = address[1]

        # Delete the address
        cursor.execute(
            """
            DELETE FROM addresses
            WHERE id = %s
              AND user_id = %s
            """,
            (address_id, user_id)
        )

        # If the deleted address was the default,
        # promote the newest remaining address to default.
        if was_default:
            cursor.execute(
                """
                SELECT id
                FROM addresses
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (user_id,)
            )

            replacement = cursor.fetchone()

            if replacement:
                cursor.execute(
                    """
                    UPDATE addresses
                    SET is_default = TRUE,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                      AND user_id = %s
                    """,
                    (replacement[0], user_id)
                )

        conn.commit()

        return {
            "message": "Address deleted successfully",
            "address_id": address_id
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to delete address"
        )

    finally:
        cursor.close()
        conn.close()

@app.post("/payments/deposit")
def submit_deposit_payment(
    request: DepositPaymentRequest,
    current_user: dict = Depends(
        require_role("CUSTOMER", "STAFF", "ADMIN", "OWNER")
    )
):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        user_id = int(current_user["user_id"])

        # 1. Get the order belonging to the authenticated user
        cursor.execute("""
            SELECT
                id,
                order_number,
                user_id,
                total_amount,
                deposit_percentage,
                deposit_amount,
                deposit_paid,
                order_status,
                payment_status
            FROM orders
            WHERE id = %s
              AND user_id = %s
            FOR UPDATE;
        """, (request.order_id, user_id))

        order = cursor.fetchone()

        if not order:
            raise HTTPException(
                status_code=404,
                detail="Order not found"
            )

        (
            order_id,
            order_number,
            order_user_id,
            total_amount,
            deposit_percentage,
            deposit_amount,
            deposit_paid,
            order_status,
            payment_status
        ) = order

        # 2. Make sure the deposit has not already been paid

        if deposit_paid:
            raise HTTPException(
                status_code=409,
                detail="Deposit has already been paid"
            )

        # 3. Prevent duplicate deposit submissions

        cursor.execute("""
            SELECT id
            FROM payments
            WHERE order_id = %s
              AND type = 'DEPOSIT'
              AND status = 'SUBMITTED'
            LIMIT 1;
        """, (order_id,))

        existing_submission = cursor.fetchone()

        if existing_submission:
            raise HTTPException(
                status_code=409,
                detail="A deposit payment is already awaiting verification"
            )

        # 4. Validate order status

        if order_status != "PENDING_PAYMENT":
            raise HTTPException(
                status_code=409,
                detail=f"Deposit cannot be submitted while order status is {order_status}"
            )

        # 5. Validate amount against server-side amount

        if request.amount != deposit_amount:
            raise HTTPException(
                status_code=422,
                detail={
                    "message": "Incorrect deposit amount",
                    "expected_amount": str(deposit_amount),
                    "submitted_amount": str(request.amount)
                }
            )

        # 6. Validate payment reference

        if not request.reference.strip():
            raise HTTPException(
                status_code=422,
                detail="Payment reference is required"
            )

        # 7. Initially we support bank transfer

        payment_method = "BANK_TRANSFER"

        # 8. Create payment submission

        cursor.execute("""
            INSERT INTO payments (
                order_id,
                user_id,
                type,
                method,
                amount,
                currency,
                reference,
                status,
                payment_proof_url,
                payment_date,
                submitted_at,
                notes
            )
            VALUES (
                %s,
                %s,
                'DEPOSIT',
                %s,
                %s,
                'KES',
                %s,
                'SUBMITTED',
                %s,
                %s,
                CURRENT_TIMESTAMP,
                %s
            )
            RETURNING id;
        """, (
            order_id,
            user_id,
            payment_method,
            request.amount,
            request.reference.strip(),
            request.payment_proof_url,
            request.payment_date,
            request.notes
        ))

        payment_id = cursor.fetchone()[0]

        # --------------------------------------------------
        # 9. Update order status
        #
        # IMPORTANT:
        # We do NOT set deposit_paid = TRUE here.
        # The payment is only SUBMITTED.
        # --------------------------------------------------

        cursor.execute("""
            UPDATE orders
            SET
                order_status = 'DEPOSIT_SUBMITTED',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s;
        """, (order_id,))

        # 10. Create order event

        cursor.execute("""
            INSERT INTO order_events (
                order_id,
                event_type,
                previous_status,
                new_status,
                message,
                created_by
            )
            VALUES (
                %s,
                'DEPOSIT_SUBMITTED',
                %s,
                'DEPOSIT_SUBMITTED',
                %s,
                %s
            );
        """, (
            order_id,
            order_status,
            f"Deposit payment submitted. Payment ID: {payment_id}",
            user_id
        ))

        conn.commit()

        return {
            "status": "success",
            "message": "Deposit payment submitted successfully",
            "payment": {
                "id": payment_id,
                "order_id": order_id,
                "order_number": order_number,
                "type": "DEPOSIT",
                "method": payment_method,
                "amount": str(request.amount),
                "currency": "KES",
                "reference": request.reference.strip(),
                "status": "SUBMITTED",
                "payment_date": str(request.payment_date)
            },
            "order": {
                "order_id": order_id,
                "order_status": "DEPOSIT_SUBMITTED",
                "deposit_verified": False
            }
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()

        print(
            "DEPOSIT PAYMENT ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to submit deposit payment"
        )

    finally:
        cursor.close()
        conn.close()

@app.get("/payments")
def get_payments(
    current_user: dict = Depends(
        require_role("STAFF", "ADMIN", "OWNER")
    )
):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT
                p.id,
                p.order_id,
                p.user_id,
                p.type,
                p.method,
                p.amount,
                p.currency,
                p.reference,
                p.status,
                p.payment_date,
                p.payment_proof_url,
                p.submitted_at,
                p.verified_at,
                p.verified_by,
                p.notes,
                p.created_at,
                p.updated_at
            FROM payments p
            ORDER BY p.submitted_at DESC
            """
        )

        payments = cursor.fetchall()

        result = []

        for payment in payments:
            result.append({
                "id": payment[0],
                "order_id": payment[1],
                "user_id": payment[2],
                "type": payment[3],
                "method": payment[4],
                "amount": str(payment[5]),
                "currency": payment[6],
                "reference": payment[7],
                "status": payment[8],
                "payment_date": payment[9],
                "payment_proof_url": payment[10],
                "submitted_at": payment[11],
                "verified_at": payment[12],
                "verified_by": payment[13],
                "notes": payment[14],
                "created_at": payment[15],
                "updated_at": payment[16]
            })

        return {
            "status": "success",
            "count": len(result),
            "payments": result
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve payments: {str(e)}"
        )

    finally:
        cursor.close()
        conn.close()

@app.post("/payments/{payment_id}/verify")
def verify_payment(
    payment_id: int,
    current_user: dict = Depends(
        require_role("STAFF", "ADMIN", "OWNER")
    )
):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Lock payment and related order during verification
        cursor.execute(
            """
            SELECT
                p.id,
                p.order_id,
                p.user_id,
                p.type,
                p.amount,
                p.status,
                o.deposit_amount,
                o.deposit_paid,
                o.order_status
            FROM payments p
            JOIN orders o ON o.id = p.order_id
            WHERE p.id = %s
            FOR UPDATE
            """,
            (payment_id,)
        )

        payment = cursor.fetchone()

        if not payment:
            raise HTTPException(
                status_code=404,
                detail="Payment not found"
            )

        (
            payment_id,
            order_id,
            user_id,
            payment_type,
            payment_amount,
            payment_status,
            deposit_amount,
            deposit_paid,
            order_status
        ) = payment

        # Payment must be submitted before verification
        if payment_status != "SUBMITTED":
            raise HTTPException(
                status_code=400,
                detail=f"Payment cannot be verified from status: {payment_status}"
            )

        # Only deposit verification is handled here
        if payment_type != "DEPOSIT":
            raise HTTPException(
                status_code=400,
                detail="Only deposit payments can be verified through this endpoint"
            )

        # Prevent duplicate deposit verification
        if deposit_paid:
            raise HTTPException(
                status_code=400,
                detail="Order deposit has already been verified"
            )

        # Verify the submitted amount against the stored order deposit
        if payment_amount != deposit_amount:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Payment amount ({payment_amount}) does not match "
                    f"required deposit ({deposit_amount})"
                )
            )

        # Mark payment as verified
        cursor.execute(
            """
            UPDATE payments
            SET
                status = 'VERIFIED',
                verified_at = CURRENT_TIMESTAMP,
                verified_by = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            """,
            (
                current_user["user_id"],
                payment_id
            )
        )

        # Update order payment + order status
        cursor.execute(
            """
            UPDATE orders
            SET
                deposit_paid = TRUE,
                payment_status = 'PARTIALLY_PAID',
                order_status = 'DEPOSIT_VERIFIED',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            """,
            (order_id,)
        )

        # Record order event
        cursor.execute(
            """
            INSERT INTO order_events (
                order_id,
                event_type,
                previous_status,
                new_status,
                message,
                created_by
            )
            VALUES (
                %s,
                'DEPOSIT_VERIFIED',
                %s,
                'DEPOSIT_VERIFIED',
                %s,
                %s
            )
            """,
            (
                order_id,
                order_status,
                "75% deposit payment verified successfully.",
                current_user["id"]
            )
        )

        conn.commit()

        return {
            "status": "success",
            "message": "Deposit payment verified successfully",
            "payment_id": payment_id,
            "order_id": order_id,
            "payment_status": "VERIFIED",
            "deposit_paid": True,
            "order_status": "DEPOSIT_VERIFIED"
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to verify payment: {str(e)}"
        )

    finally:
        cursor.close()
        conn.close()

@app.get("/admin/payments")
def get_admin_payments(
    current_user: dict = Depends(
        require_role("STAFF", "ADMIN", "OWNER")
    )
):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT
                p.id,
                p.order_id,
                o.order_number,
                p.user_id,

                u.name,
                u.email,

                p.type,
                p.method,
                p.amount,
                p.currency,
                p.reference,
                p.status,
                p.submitted_at,
                p.verified_at,
                p.verified_by,
                p.notes,

                o.total_amount,
                o.deposit_amount,
                o.balance_amount,
                o.order_status,
                o.payment_status

            FROM payments p

            JOIN orders o
                ON o.id = p.order_id

            JOIN users u
                ON u.id = p.user_id

            WHERE p.type = 'DEPOSIT'

            ORDER BY
                CASE
                    WHEN p.status = 'SUBMITTED' THEN 0
                    WHEN p.status = 'VERIFIED' THEN 1
                    WHEN p.status = 'REJECTED' THEN 2
                    ELSE 3
                END,

                p.submitted_at DESC;
            """
        )

        payments = cursor.fetchall()

        results = []

        for payment in payments:

            results.append({
                "payment": {
                    "id": payment[0],
                    "order_id": payment[1],
                    "order_number": payment[2],
                    "user_id": payment[3],
                    "type": payment[6],
                    "method": payment[7],
                    "amount": payment[8],
                    "currency": payment[9],
                    "reference": payment[10],
                    "status": payment[11],
                    "submitted_at": payment[12],
                    "verified_at": payment[13],
                    "verified_by": payment[14],
                    "notes": payment[15]
                },

                "customer": {
                    "name": payment[4],
                    "email": payment[5]
                },

                "order": {
                    "total_amount": payment[16],
                    "deposit_amount": payment[17],
                    "balance_amount": payment[18],
                    "order_status": payment[19],
                    "payment_status": payment[20]
                }
            })

        return {
            "status": "success",
            "count": len(results),
            "payments": results
        }

    except Exception as e:

        print(
            "ADMIN PAYMENT LIST ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve payment records"
        )

    finally:
        cursor.close()
        conn.close()

@app.post("/admin/payments/{payment_id}/verify")
def verify_payment(
    payment_id: int,
    request: PaymentVerificationRequest,
    current_user: dict = Depends(
        require_role("STAFF", "ADMIN", "OWNER")
    )
):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:

        verifier_id = int(current_user["user_id"])

        # 1. Lock payment

        cursor.execute(
            """
            SELECT
                id,
                order_id,
                user_id,
                type,
                method,
                amount,
                currency,
                reference,
                status,
                submitted_at
            FROM payments
            WHERE id = %s
            FOR UPDATE;
            """,
            (payment_id,)
        )

        payment = cursor.fetchone()

        if not payment:
            raise HTTPException(
                status_code=404,
                detail="Payment not found"
            )

        (
            payment_id,
            order_id,
            payment_user_id,
            payment_type,
            payment_method,
            payment_amount,
            currency,
            reference,
            payment_status,
            submitted_at
        ) = payment

        # 2. Payment must be a deposit

        if payment_type != "DEPOSIT":

            raise HTTPException(
                status_code=400,
                detail="Only deposit payments can be verified here"
            )


        # 3. Payment must be SUBMITTED

        if payment_status != "SUBMITTED":

            raise HTTPException(
                status_code=409,
                detail=(
                    f"Payment cannot be verified because its "
                    f"current status is {payment_status}"
                )
            )

        # 4. Lock order

        cursor.execute(
            """
            SELECT
                id,
                order_number,
                user_id,
                total_amount,
                deposit_percentage,
                deposit_amount,
                balance_percentage,
                balance_amount,
                deposit_paid,
                balance_paid,
                payment_status,
                order_status
            FROM orders
            WHERE id = %s
            FOR UPDATE;
            """,
            (order_id,)
        )

        order = cursor.fetchone()

        if not order:

            raise HTTPException(
                status_code=404,
                detail="Associated order not found"
            )

        (
            order_id,
            order_number,
            order_user_id,
            total_amount,
            deposit_percentage,
            deposit_amount,
            balance_percentage,
            balance_amount,
            deposit_paid,
            balance_paid,
            order_payment_status,
            order_status
        ) = order

        # 5. Confirm payment belongs to order customer

        if int(payment_user_id) != int(order_user_id):

            raise HTTPException(
                status_code=409,
                detail="Payment ownership does not match order ownership"
            )

        # 6. Ensure deposit hasn't already been paid

        if deposit_paid:

            raise HTTPException(
                status_code=409,
                detail="The order deposit has already been verified"
            )

        # 7. Verify exact amount

        expected_amount = Decimal(
            str(deposit_amount)
        ).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP
        )

        submitted_amount = Decimal(
            str(payment_amount)
        ).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP
        )

        if submitted_amount != expected_amount:

            raise HTTPException(
                status_code=409,
                detail=(
                    f"Payment amount does not match required deposit. "
                    f"Expected {expected_amount}, "
                    f"received {submitted_amount}."
                )
            )

        # 8. Verify payment

        cursor.execute(
            """
            UPDATE payments
            SET
                status = 'VERIFIED',
                verified_at = CURRENT_TIMESTAMP,
                verified_by = %s,
                notes = %s
            WHERE id = %s
            RETURNING
                id,
                status,
                verified_at,
                verified_by,
                notes;
            """,
            (
                verifier_id,
                request.notes,
                payment_id
            )
        )

        verified_payment = cursor.fetchone()

        # 9. Update order

        cursor.execute(
            """
            UPDATE orders
            SET
                deposit_paid = TRUE,
                payment_status = 'PARTIALLY_PAID',
                order_status = 'DEPOSIT_VERIFIED',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s;
            """,
            (order_id,)
        )

        # 10. Create order event

        cursor.execute(
            """
            INSERT INTO order_events (
                order_id,
                event_type,
                previous_status,
                new_status,
                message,
                created_by,
                created_at
            )
            VALUES (
                %s,
                'DEPOSIT_VERIFIED',
                %s,
                'DEPOSIT_VERIFIED',
                %s,
                %s,
                CURRENT_TIMESTAMP
            );
            """,
            (
                order_id,
                order_status,
                (
                    f"Deposit payment verified. "
                    f"Amount: {submitted_amount} KES. "
                    f"Reference: {reference}"
                ),
                verifier_id
            )
        )

        # 11. Commit everything atomically

        conn.commit()

        return {
            "status": "success",

            "message": (
                "Payment verified successfully"
            ),

            "payment": {
                "id": verified_payment[0],
                "status": verified_payment[1],
                "verified_at": verified_payment[2],
                "verified_by": verified_payment[3],
                "notes": verified_payment[4]
            },

            "order": {
                "id": order_id,
                "order_number": order_number,
                "deposit_amount": deposit_amount,
                "deposit_paid": True,
                "balance_amount": balance_amount,
                "balance_paid": balance_paid,
                "payment_status": "PARTIALLY_PAID",
                "order_status": "DEPOSIT_VERIFIED"
            }
        }

    except HTTPException:

        conn.rollback()
        raise

    except Exception as e:

        conn.rollback()

        print(
            "VERIFY PAYMENT ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to verify payment"
        )

    finally:

        cursor.close()
        conn.close()

@app.post("/admin/payments/{payment_id}/reject")
def reject_payment(
    payment_id: int,
    request: PaymentRejectionRequest,
    current_user: dict = Depends(
        require_role("STAFF", "ADMIN", "OWNER")
    )
):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:

        verifier_id = int(current_user["user_id"])

        rejection_notes = request.notes.strip()

        if not rejection_notes:

            raise HTTPException(
                status_code=400,
                detail="Rejection reason is required"
            )

        # Lock payment

        cursor.execute(
            """
            SELECT
                id,
                order_id,
                user_id,
                type,
                amount,
                reference,
                status
            FROM payments
            WHERE id = %s
            FOR UPDATE;
            """,
            (payment_id,)
        )

        payment = cursor.fetchone()

        if not payment:

            raise HTTPException(
                status_code=404,
                detail="Payment not found"
            )

        (
            payment_id,
            order_id,
            payment_user_id,
            payment_type,
            payment_amount,
            reference,
            payment_status
        ) = payment

        # Validate payment type

        if payment_type != "DEPOSIT":

            raise HTTPException(
                status_code=400,
                detail="Only deposit payments can be rejected here"
            )

        # Validate status

        if payment_status != "SUBMITTED":

            raise HTTPException(
                status_code=409,
                detail=(
                    f"Payment cannot be rejected because its "
                    f"current status is {payment_status}"
                )
            )

        # Lock order

        cursor.execute(
            """
            SELECT
                id,
                order_number,
                order_status,
                deposit_paid
            FROM orders
            WHERE id = %s
            FOR UPDATE;
            """,
            (order_id,)
        )

        order = cursor.fetchone()

        if not order:

            raise HTTPException(
                status_code=404,
                detail="Associated order not found"
            )

        (
            order_id,
            order_number,
            order_status,
            deposit_paid
        ) = order

        if deposit_paid:

            raise HTTPException(
                status_code=409,
                detail="This order's deposit has already been verified"
            )

        # Reject payment

        cursor.execute(
            """
            UPDATE payments
            SET
                status = 'REJECTED',
                verified_at = CURRENT_TIMESTAMP,
                verified_by = %s,
                notes = %s
            WHERE id = %s
            RETURNING
                id,
                status,
                verified_at,
                verified_by,
                notes;
            """,
            (
                verifier_id,
                rejection_notes,
                payment_id
            )
        )

        rejected_payment = cursor.fetchone()

        # Return order to payment-required state

        cursor.execute(
            """
            UPDATE orders
            SET
                order_status = 'PENDING_PAYMENT',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s;
            """,
            (order_id,)
        )

        # Create event

        cursor.execute(
            """
            INSERT INTO order_events (
                order_id,
                event_type,
                previous_status,
                new_status,
                message,
                created_by,
                created_at
            )
            VALUES (
                %s,
                'DEPOSIT_REJECTED',
                %s,
                'PENDING_PAYMENT',
                %s,
                %s,
                CURRENT_TIMESTAMP
            );
            """,
            (
                order_id,
                order_status,
                (
                    f"Deposit payment rejected. "
                    f"Reference: {reference}. "
                    f"Reason: {rejection_notes}"
                ),
                verifier_id
            )
        )

        conn.commit()

        return {
            "status": "success",
            "message": "Payment rejected",
            "payment": {
                "id": rejected_payment[0],
                "status": rejected_payment[1],
                "verified_at": rejected_payment[2],
                "verified_by": rejected_payment[3],
                "notes": rejected_payment[4]
            },
            "order": {
                "id": order_id,
                "order_number": order_number,
                "order_status": "PENDING_PAYMENT",
                "deposit_paid": False
            }
        }

    except HTTPException:

        conn.rollback()
        raise

    except Exception as e:

        conn.rollback()

        print(
            "REJECT PAYMENT ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to reject payment"
        )

    finally:

        cursor.close()
        conn.close()