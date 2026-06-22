from fastapi import APIRouter, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db
from services.claude import ai_search
from api.search import search as hybrid_search

router = APIRouter()

@router.get("/summary")
async def get_search_summary(q: str = Query(...), db: AsyncSession = Depends(get_db)):
    # Get top results from hybrid search
    results = await hybrid_search(q=q, db=db)
    items = results.get("items", [])[:10]

    # Prepare context for Claude
    catalog_context = [
        {"id": i["id"], "title": i["title"], "sku": i["sku"], "attributes": i["attributes"]}
        for i in items
    ]

    # Get AI summary/analysis
    ai_res = await ai_search(query=q, catalog=catalog_context)

    return {
        "summary": ai_res.get("summary", "AI не зміг проаналізувати запит."),
        "confidence": ai_res.get("confidence", 0),
        "matches": ai_res.get("matches", [])
    }
