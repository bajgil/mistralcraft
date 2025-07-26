import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai

# --- Konfiguracja ---
# Wklej tutaj swój klucz API skopiowany z Google AI Studio
# Pamiętaj, aby nigdy nie udostępniać tego klucza publicznie!
API_KEY = "AIzaSyA7IBxOcbPh7tTOBWoy1l4-4qmdAqFyGWs" 

# Inicjalizacja API Gemini
try:
    genai.configure(api_key=API_KEY)
    model = genai.GenerativeModel('gemini-2.5-pro') # Używamy szybkiego i wydajnego modelu
    print("Model Gemini został pomyślnie zainicjowany!")
except Exception as e:
    print(f"Błąd inicjalizacji Gemini: {e}")
    exit()

# Stwórz aplikację Flask
app = Flask(__name__)
CORS(app)

# Definicja "promptu" - czyli instrukcji dla modelu
PROMPT_TEMPLATE = """
Twoim zadaniem jest kreatywne połączenie dwóch słów w jedno nowe pojęcie, w stylu gry "Infinite Craft".
Odpowiedz TYLKO I WYŁĄCZNIE jednym lub dwoma słowami będącymi wynikiem. Żadnych dodatkowych zdań, wyjaśnień ani znaków interpunkcyjnych.

Przykład:
Woda + Ogień = Para

Kombinacja:
{element1} + {element2} ="""

@app.route('/combine', methods=['POST'])
def combine_elements():
    data = request.json
    element1 = data.get('element1')
    element2 = data.get('element2')

    if not element1 or not element2:
        return jsonify({"error": "Brak jednego z elementów"}), 400

    # Stwórz pełny prompt
    prompt = PROMPT_TEMPLATE.format(element1=element1, element2=element2)

    try:
        # Wyślij zapytanie do API Gemini
        response = model.generate_content(prompt)
        
        # Wyciągnij i oczyść wynik
        result = response.text.strip()

        # Zwróć wynik w formacie JSON
        return jsonify({"result": result})
        
    except Exception as e:
        print(f"Wystąpił błąd podczas komunikacji z API Gemini: {e}")
        return jsonify({"error": "Błąd serwera AI"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)