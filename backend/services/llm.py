import os
import anthropic
from typing import List, Dict

class LLMService:
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        if self.api_key:
            self.client = anthropic.Anthropic(api_key=self.api_key)
        else:
            self.client = None

    async def get_chat_response(self, messages: List[Dict]) -> str:
        if not self.client:
            return "⚠️ ANTHROPIC_API_KEY не знайдений. Додайте його в налаштування сервера."

        try:
            # Преобразование истории сообщений
            chat_history = []
            for m in messages:
                # Ожидаем поля role и content от фронтенда
                role = "user" if m.get("role") == "user" else "assistant"
                chat_history.append({"role": role, "content": m.get("content", "")})

            response = self.client.messages.create(
                model="claude-3-5-sonnet-20240620",
                max_tokens=1500,
                temperature=0.2, # Низкая температура для точности тех. данных
                system="""Ти — інтелектуальний помічник техпідтримки компанії TI-Katalog. 
                Твоя спеціалізація: промислове обладнання (шланги, фітинги, насоси, ущільнення).
                В твоїй базі 189 каталогів. Коли користувач запитує про товар (наприклад, 'Шланг ДН 65'):
                1. Шукай відповідність у технічних параметрах (DN, PN, матеріал).
                2. Якщо знайдено кілька варіантів, уточни призначення (харчовий, хімічний, паливний).
                3. Завжди намагайся надати артикул (SKU), якщо він є в контексті.
                Відповідай українською мовою. Будь точним у цифрах.""",
                messages=chat_history
            )

            return response.content[0].text
        except Exception as e:
            return f"Claude API Error: {str(e)}"

llm_service = LLMService()
