import streamlit as st
import pandas as pd
import uuid
from datetime import datetime
import json
import sqlite3
import plotly.express as px

# --- DATABASE SETUP ---
def init_db():
    conn = sqlite3.connect('adrs_st.db')
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS receipts (
            id TEXT PRIMARY KEY,
            timestamp TEXT,
            user_input TEXT,
            intent TEXT,
            ai_output TEXT,
            reasoning TEXT,
            confidence REAL,
            status TEXT,
            metadata TEXT,
            review_metadata TEXT
        )
    ''')
    conn.commit()
    conn.close()

def save_receipt(receipt):
    conn = sqlite3.connect('adrs_st.db')
    c = conn.cursor()
    c.execute('''
        INSERT INTO receipts (id, timestamp, user_input, intent, ai_output, reasoning, confidence, status, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        receipt['id'], receipt['timestamp'], receipt['user_input'], 
        receipt['intent'], receipt['ai_output'], receipt['reasoning'], 
        receipt['confidence'], receipt['status'], json.dumps(receipt['metadata'])
    ))
    conn.commit()
    conn.close()

def get_all_receipts():
    conn = sqlite3.connect('adrs_st.db')
    df = pd.read_sql_query("SELECT * FROM receipts", conn)
    conn.close()
    return df

def update_review(receipt_id, status, notes):
    conn = sqlite3.connect('adrs_st.db')
    c = conn.cursor()
    review_data = json.dumps({"reviewer": "admin", "notes": notes, "at": str(datetime.now())})
    c.execute("UPDATE receipts SET status = ?, review_metadata = ? WHERE id = ?", (status, review_data, receipt_id))
    conn.commit()
    conn.close()

# --- CORE LOGIC (PHASES 1-3) ---
def extract_intent(text):
    if any(word in text.lower() for word in ['what', 'how', 'why', 'explain']):
        return "INFORMATION_QUERY"
    return "GENERAL_INTERACTION"

def generate_reasoning(text, intent):
    if intent == "INFORMATION_QUERY":
        return f"The system identified a request for information. It retrieved relevant context from internal knowledge bases to formulate a fact-based response to '{text[:30]}...'."
    return "The system processed a general interaction using standard model weights and safety filters."

def simulate_inference(user_input):
    intent = extract_intent(user_input)
    ai_output = f"This is a simulated AI response for: {user_input}"
    reasoning = generate_reasoning(user_input, intent)
    confidence = 0.85 if intent == "INFORMATION_QUERY" else 0.92
    
    receipt = {
        "id": str(uuid.uuid4()),
        "timestamp": str(datetime.now()),
        "user_input": user_input,
        "intent": intent,
        "ai_output": ai_output,
        "reasoning": reasoning,
        "confidence": confidence,
        "status": "PENDING",
        "metadata": {"model": "gpt-4-mock", "version": "1.0"}
    }
    return receipt

# --- UI SETUP ---
st.set_page_config(page_title="ADRS Intelligence", page_icon="🛡️", layout="wide")
init_db()

st.sidebar.title("🛡️ ADRS Navigation")
page = st.sidebar.radio("Go to", ["New Decision", "Audit Dashboard", "Security Analytics"])

# --- PAGE: NEW DECISION ---
if page == "New Decision":
    st.title("🚀 New AI Decision Engine")
    st.markdown("Generate AI outputs with full traceability and receipt generation.")
    
    with st.form("inference_form"):
        user_input = st.text_area("User Input", placeholder="Ask the AI something...")
        submitted = st.form_submit_button("Execute Inference")
        
        if submitted and user_input:
            with st.spinner("Generating decision receipt..."):
                receipt = simulate_inference(user_input)
                save_receipt(receipt)
                st.success(f"Decision Recorded! Receipt ID: {receipt['id']}")
                
                col1, col2 = st.columns(2)
                with col1:
                    st.subheader("AI Output")
                    st.info(receipt['ai_output'])
                with col2:
                    st.subheader("Justification")
                    st.warning(receipt['reasoning'])
                
                with st.expander("View Full Receipt Metadata"):
                    st.json(receipt)

# --- PAGE: AUDIT DASHBOARD ---
elif page == "Audit Dashboard":
    st.title("⚖️ Governance & Audit Dashboard")
    df = get_all_receipts()
    
    if df.empty:
        st.info("No decision receipts found. Go to 'New Decision' to generate some.")
    else:
        # Filtering
        status_filter = st.selectbox("Filter by Status", ["ALL", "PENDING", "APPROVED", "REJECTED"])
        if status_filter != "ALL":
            df = df[df['status'] == status_filter]
            
        st.dataframe(df[['id', 'timestamp', 'intent', 'status', 'confidence']], use_container_width=True)
        
        st.markdown("---")
        st.subheader("Manual Review (Human-in-the-loop)")
        selected_id = st.selectbox("Select Receipt ID to Review", df['id'].tolist())
        
        if selected_id:
            row = df[df['id'] == selected_id].iloc[0]
            st.write(f"**User Input:** {row['user_input']}")
            st.write(f"**AI Output:** {row['ai_output']}")
            
            with st.form("review_form"):
                new_status = st.radio("Verdict", ["APPROVED", "REJECTED"], horizontal=True)
                notes = st.text_area("Reviewer Notes")
                if st.form_submit_button("Submit Governance Verdict"):
                    update_review(selected_id, new_status, notes)
                    st.success("Verdict recorded. Refreshing...")
                    st.rerun()

# --- PAGE: ANALYTICS ---
elif page == "Security Analytics":
    st.title("📈 Decision Intelligence & Risk Analytics")
    df = get_all_receipts()
    
    if df.empty:
        st.info("Insufficient data for analytics.")
    else:
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("Decision Volume by Intent")
            fig = px.pie(df, names='intent', hole=0.4, color_discrete_sequence=px.colors.sequential.Teal)
            st.plotly_chart(fig)
            
        with col2:
            st.subheader("Confidence Trend")
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            fig = px.line(df.sort_values('timestamp'), x='timestamp', y='confidence', markers=True)
            st.plotly_chart(fig)
            
        st.markdown("---")
        st.subheader("🚩 Risk Indicators (Low Confidence Alerts)")
        anomalies = df[df['confidence'] < 0.6]
        if not anomalies.empty:
            st.error(f"Found {len(anomalies)} anomalous decisions requiring immediate audit.")
            st.table(anomalies[['id', 'user_input', 'confidence']])
        else:
            st.success("No critical drift or anomalies detected in the current sequence.")

st.sidebar.markdown("---")
st.sidebar.info(f"Built by **Armaan Jena**")
