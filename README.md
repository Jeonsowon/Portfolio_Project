# AI Portfolio Remodeler (Capstone Project)

채용공고(URL)를 분석하여 자격요건/우대사항 키워드를 자동 추출하고,  
이를 기반으로 **포트폴리오의 스킬 및 프로젝트를 가중치 기준으로 재정렬**해주는 웹 서비스입니다.

또한, 포트폴리오 편집 화면에서 **“GPT 설명 추천” 버튼** 클릭 시 OpenAI API를 호출하여 프로젝트 설명을 보강합니다.

---

## 📌 주요 기능

### 1. 사용자 관리
- 회원가입 / 로그인
- JWT 기반 인증
- 사용자별 포트폴리오 관리

### 2. 포트폴리오 관리
- 생성 / 수정 / 삭제
- 기본 템플릿 제공
- 실시간 미리보기

### 3. 채용공고 분석
- 채용공고 URL 크롤링 (HTML 파싱)
- 자격요건 / 우대사항 자동 추출
- 키워드 가중치 계산

### 4. 포트폴리오 자동 재정렬
- 키워드-스킬 매칭 점수 계산
- 프로젝트 기술 스택 기반 점수 산출
- 가중치 기반 정렬 알고리즘 적용
- 재정렬 결과 DB 저장

### 5. 프로젝트 설명 추천 (Hybrid AI)
- 사용자 버튼 클릭 시 GPT 호출
- 한국어 프로젝트 설명 자동 보강
- GPT 실패 시 규칙 기반 추천으로 자동 대체

---

## 🛠 Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS

### Backend
- Spring Boot 3.x
- Java 17
- Maven
- JWT Authentication

### Database
- Supabase (PostgreSQL)

### AI
- OpenAI API (사용자 트리거)
- 규칙 기반 키워드 추출 및 가중치 정렬 알고리즘

---

## 🏗 Architecture

3-Tier Architecture 기반 설계

- Presentation Layer: React SPA
- Business Logic Layer: Spring Boot REST API
- Data Layer: Supabase (PostgreSQL)

### 처리 흐름

1. 사용자가 채용공고 URL 입력
2. 백엔드에서 크롤링 및 텍스트 추출
3. 키워드 및 가중치 계산
4. 스킬/프로젝트 매칭 점수 산출
5. 가중치 기반 재정렬 수행
6. 결과 저장 및 반환
7. (선택) GPT 설명 추천 버튼 클릭 시 LLM 호출

---

## 🗄 Data Model (요약)

### users
- id
- email
- password_hash
- name

### portfolio
- id
- owner_email
- kind (BASIC / REMODEL)
- data_json (전체 포트폴리오 JSON 저장)
- updated_at

JSON 기반 구조를 사용하여 확장성을 확보했습니다.

---

## 🔐 보안 설계

- JWT 기반 인증
- CORS 설정
- 환경변수 기반 API 키 관리
- GPT 요청 로그 최소화 (개인정보 미기록)

---

## 📊 성과 (보고서 기준)

- 자격요건/우대사항 추출률: 90% 이상
- 평균 응답 시간: 3초 이내
- 수동 포트폴리오 수정 시간 약 80% 단축
- 80개 이상의 기술 스택 키워드 지원

---

## 💡 프로젝트 의의

이 프로젝트는 단순 포트폴리오 제작 도구가 아닌,

**채용공고 적합도를 극대화하는 지능형 포트폴리오 최적화 엔진**

을 목표로 개발되었습니다.

반복적인 수동 작업을 자동화하고,  
AI 기반 분석을 통해 실제 채용 환경에 맞는 포트폴리오 구성을 지원합니다.
