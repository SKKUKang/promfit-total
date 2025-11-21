from flask import Flask, request, jsonify, g
import google.generativeai as genai
import os
from dotenv import load_dotenv
import sqlite3
from flask_cors import CORS
import jwt # PyJWT
import requests
from functools import wraps
import json

load_dotenv()
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# # ==========================================
# # [설정] AWS Cognito 정보 입력
# # ==========================================
AWS_REGION = 'ap-northeast-2'
USER_POOL_ID = 'ap-northeast-2_uV8vEmX2v'  # 여기에 실제 User Pool ID 입력
APP_CLIENT_ID = '3ihbvo5jfqieb0pkio2slmvuds'    # 여기에 실제 App Client ID 입력

# # Cognito 공개키(JWKS) URL 생성
JWKS_URL = f"https://cognito-idp.{AWS_REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json"

# # ==========================================
# # [핵심] 토큰 검증 데코레이터 (라이브러리 대체)
# # ==========================================
def get_cognito_public_keys():
    """AWS에서 공개키 목록을 가져옵니다."""
    try:
        response = requests.get(JWKS_URL)
        return response.json()['keys']
    except Exception as e:
        print(f"키 가져오기 실패: {e}")
        return []

# # 서버 시작 시 키를 미리 받아옵니다 (속도 향상)
COGNITO_KEYS = get_cognito_public_keys()

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        
#         # 1. 헤더에서 토큰 추출
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
        
        if not token:
            print("토큰이 없습니다. 로그인이 필요합니다.")
            return jsonify({'message': '토큰이 없습니다. 로그인이 필요합니다.'}), 401

        try:
#             # 2. 토큰의 헤더 분석 (kid 찾기)
            header = jwt.get_unverified_header(token)
            kid = header['kid']
            
#             # 3. 맞는 공개키 찾기
            key = next(k for k in COGNITO_KEYS if k['kid'] == kid)
            
#             # 4. 토큰 검증 (서명, 만료시간, Client ID 확인)
            public_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key))
            payload = jwt.decode(token, public_key, algorithms=['RS256'], audience=APP_CLIENT_ID)
            
#             # 5. 성공 시 사용자 정보를 전역 변수 g에 저장
            g.user_email = payload.get('email') # 이메일 저장
            
        except StopIteration:
            print("Invalid key ID")
            return jsonify({'message': '유효하지 않은 키 ID입니다.'}), 401
        except jwt.ExpiredSignatureError:
            print("Token has expired")
            return jsonify({'message': '토큰이 만료되었습니다. 다시 로그인하세요.'}), 401
        except Exception as e:
            print(f"Token Error: {e}")
            return jsonify({'message': '토큰이 유효하지 않습니다.'}), 401

        return f(*args, **kwargs)
    return decorated_function

# # ==========================================

genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
model = genai.GenerativeModel("gemini-2.5-flash")

class FrameworkPromptExecutor:
    def __init__(self, db_path: str = "prompts.db"):
        self.db_path = db_path

    def execute(self, framework_name: str, user_question: str) -> str:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT prompt_text FROM framework_prompts WHERE framework = ?", (framework_name,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            raise ValueError(f"framework_prompts 테이블에 '{framework_name}' 항목이 존재하지 않습니다.")
        framework_prompt = row[0]
        final_prompt = f" 사용자의 질문에 바로 답변하지 마라., 사용자의 질문:{user_question}, 사용자의 질문에 바로 응답하는게 아니라 다음 system prompt를 적용하여 개선된 질문을 답변으로 제공하라. \n # === SYSTEM PROMPT === {framework_prompt} \n"
        return model.generate_content(final_prompt).text.strip()

executor = FrameworkPromptExecutor(db_path="prompts.db")

@app.route("/api/prompt", methods=["POST"])
@login_required
def generate_prompt():
    data = request.get_json()
    user_question = data.get("prompt")
    framework = data.get("framework", "TAG")

    if not user_question:
        return jsonify({"error": "질문이 필요합니다"}), 400

    try:
        refined_prompt = executor.execute(framework, user_question)
        return jsonify({"refined_prompt": refined_prompt})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

@app.route("/api/frameworks", methods=["GET"])
# 목록 조회는 로그인 없이 가능 (필요하면 @login_required 추가)
def list_frameworks():
    try:
        conn = sqlite3.connect("prompts.db")
        cursor = conn.cursor()
        cursor.execute("SELECT framework, prompt_text, author, likes, description FROM framework_prompts")
        rows = cursor.fetchall()
        conn.close()
        frameworks = [{"framework": row[0], "prompt_text": row[1], "author": row[2], "likes": row[3], "description": row[4]} for row in rows]
        return jsonify({"frameworks": frameworks})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/frameworks", methods=["POST"])
@login_required
def create_framework():
    # 토큰에서 추출한 이메일 사용
    current_user_email = g.user_email 

    data = request.get_json()
    framework_name = data.get("framework")
    prompt_text = data.get("prompt_text")
    description = data.get("description")
    
    author = current_user_email 

    if not framework_name or not prompt_text:
        return jsonify({"error": "framework와 prompt_text 모두 필요합니다"}), 400

    try:
        conn = sqlite3.connect("prompts.db")
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM framework_prompts WHERE framework = ?", (framework_name,))
        if cursor.fetchone():
            conn.close()
            return jsonify({"error": f"'{framework_name}' 프레임워크는 이미 존재합니다"}), 400

        cursor.execute(
            "INSERT INTO framework_prompts (framework, prompt_text, author, likes, description) VALUES (?, ?, ?, ?, ?)",
            (framework_name, prompt_text, author, 0, description)
        )
        conn.commit()
        conn.close()
        return jsonify({"message": f"'{framework_name}' 프레임워크가 생성되었습니다 (작성자: {author})"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/frameworks", methods=["DELETE"])
@login_required
def delete_framework():
    data = request.get_json()
    framework_name = data.get("framework")

    if not framework_name:
        return jsonify({"error": "삭제할 framework 이름이 필요합니다"}), 400

    try:
        conn = sqlite3.connect("prompts.db")
        cursor = conn.cursor()
        # 확인: 프레임워크 존재 여부 및 작성자 조회
        cursor.execute("SELECT author FROM framework_prompts WHERE framework = ?", (framework_name,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return jsonify({"error": f"'{framework_name}' 프레임워크는 존재하지 않습니다"}), 404

        db_author = row[0]
        current_user_email = getattr(g, 'user_email', None)

        # 작성자 검사: 작성자와 현재 요청자의 이메일이 같아야 삭제 가능
        if not current_user_email or str(db_author).lower() != str(current_user_email).lower():
            conn.close()
            return jsonify({"error": "삭제 권한이 없습니다. 작성자만 삭제할 수 있습니다."}), 403

        cursor.execute("DELETE FROM framework_prompts WHERE framework = ?", (framework_name,))
        conn.commit()
        conn.close()
        return jsonify({"message": f"'{framework_name}' 프레임워크가 삭제되었습니다"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)