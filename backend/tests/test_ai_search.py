import pytest
from unittest.mock import AsyncMock, patch
from api.ai_search import get_search_summary

@pytest.mark.asyncio
async def test_ai_search_summary_logic():
    # Mock search result
    mock_items = [
        {"id": 1, "title": "Hose A", "sku": "SKU-A", "attributes": {"DN": "50"}},
    ]

    # Mock hybrid search
    with patch("api.ai_search.hybrid_search", new_callable=AsyncMock) as mock_hybrid:
        mock_hybrid.return_value = {"items": mock_items}

        # Mock ai_search service
        with patch("api.ai_search.ai_search", new_callable=AsyncMock) as mock_ai:
            mock_ai.return_value = {
                "summary": "This is a technical summary.",
                "confidence": 0.95,
                "matches": [{"id": 1, "reason": "Match"}]
            }

            # Call the endpoint function directly (with dummy DB session)
            result = await get_search_summary(q="test query", db=AsyncMock())

            assert result["summary"] == "This is a technical summary."
            assert result["confidence"] == 0.95
            assert len(result["matches"]) == 1
            mock_hybrid.assert_called_once()
            mock_ai.assert_called_once()
