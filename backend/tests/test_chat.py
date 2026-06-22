import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from api.chat import ChatRequest, chat

@pytest.mark.asyncio
async def test_chat_api_logic():
    # Mock request data
    req = ChatRequest(message="test", history=[])

    # Mock DB session for RAG context
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_db.execute.return_value = mock_result

    # Mock os.getenv for API key
    with patch("os.getenv", return_value="fake_key"):
        # Mock httpx response
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "content": [{"text": "Hello, I am Claude."}]
            }
            mock_post.return_value = mock_response

            result = await chat(req=req, db=mock_db)

            assert result["reply"] == "Hello, I am Claude."
            assert result["rag_used"] is False
