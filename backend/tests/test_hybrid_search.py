import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from api.search import search as hybrid_search

@pytest.mark.asyncio
async def test_hybrid_search_logic():
    # Mock DB session
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [] # Empty results for simplicity
    mock_db.execute.return_value = mock_result

    with patch("api.search._vector_search", new_callable=AsyncMock) as mock_vector:
        mock_vector.return_value = []

        # Explicitly pass page and page_size as ints
        result = await hybrid_search(q="DN50", db=mock_db, page=1, page_size=20)

        assert result["query"] == "DN50"
        assert "items" in result
        assert result["total"] == 0
