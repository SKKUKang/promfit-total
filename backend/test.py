import requests

API_URL = "http://127.0.0.1:5000/api/prompt"

user_question = "내가 이번에 알바를 하게 됐는데 세금을 어떻게 내야 돼?"
framework = "RTF"  # RTF, BAB, CARE, CO_STAR 등 원하는 프레임워크 선택

try:
    res = requests.post(API_URL, json={
        "prompt": user_question,
        "framework": framework
    })
    data = res.json()

    if "refined_prompt" in data:
        print("🤖 최종 프롬프트:\n", data["refined_prompt"])
    else:
        print("⚠️ 오류:", data.get("error", "Unknown error"))

except Exception as e:
    print("❌ 요청 실패:", e)
