package com.itjundobal.remoteservices.inbox;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final String API_URL = "https://remote-services.pages.dev/api/bookings";
    private static final String PREFS = "remote_services_inbox";
    private static final String KEY = "admin_key";

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final List<Booking> bookings = new ArrayList<>();
    private SharedPreferences prefs;
    private LinearLayout root;
    private LinearLayout list;
    private TextView status;

    private int bg = Color.rgb(7, 16, 24);
    private int panel = Color.rgb(12, 24, 34);
    private int cyan = Color.rgb(85, 213, 255);
    private int text = Color.rgb(237, 247, 255);
    private int muted = Color.rgb(143, 166, 182);

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(bg);
        getWindow().setNavigationBarColor(bg);
        prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String savedKey = prefs.getString(KEY, "");
        if (savedKey.isEmpty()) showLogin(); else loadBookings(savedKey, false);
    }

    private void base() {
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(bg);
        root.setPadding(dp(16), dp(12), dp(16), dp(12));
        setContentView(root);
    }

    private void showLogin() {
        base();
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(dp(4), dp(22), dp(4), dp(4));

        TextView badge = label("RS", 20, cyan, true);
        badge.setGravity(Gravity.CENTER);
        badge.setBackground(round(cyan, 48, 0x22000000));
        box.addView(badge, new LinearLayout.LayoutParams(dp(58), dp(58)));

        TextView eyebrow = label("REMOTE SERVICES", 11, cyan, true);
        eyebrow.setLetterSpacing(0.12f);
        add(box, eyebrow, 0, 20);
        add(box, label("Inbox", 38, text, true), 0, 8);
        add(box, label("Owner access only. Enter your Admin Key to open the Inbox.", 14, muted, false), 0, 20);

        EditText keyInput = new EditText(this);
        keyInput.setHint("Admin Key");
        keyInput.setHintTextColor(Color.rgb(95, 118, 132));
        keyInput.setTextColor(text);
        keyInput.setSingleLine(true);
        keyInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        keyInput.setPadding(dp(14), dp(12), dp(14), dp(12));
        keyInput.setBackground(round(Color.rgb(7, 16, 24), 14, 0xFF284456));
        add(box, keyInput, 0, 12);

        Button open = button("OPEN INBOX", cyan, Color.rgb(3, 16, 22));
        add(box, open, 0, 14);
        TextView message = label("", 13, Color.rgb(255, 150, 150), false);
        add(box, message, 0, 12);

        open.setOnClickListener(v -> {
            String key = keyInput.getText().toString().trim();
            if (key.isEmpty()) { message.setText("Enter your Admin Key."); return; }
            open.setEnabled(false);
            message.setText("Connecting…");
            loadBookings(key, true, () -> open.setEnabled(true), message);
        });

        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.addView(box);
        root.addView(scroll, new LinearLayout.LayoutParams(-1, -1));
    }

    private void showInbox() {
        base();
        LinearLayout header = new LinearLayout(this);
        header.setGravity(Gravity.CENTER_VERTICAL);

        LinearLayout titles = new LinearLayout(this);
        titles.setOrientation(LinearLayout.VERTICAL);
        TextView eyebrow = label("REMOTE SERVICES", 11, cyan, true);
        eyebrow.setLetterSpacing(0.12f);
        titles.addView(eyebrow);
        titles.addView(label("Inbox", 34, text, true));
        header.addView(titles, new LinearLayout.LayoutParams(0, -2, 1));

        TextView count = label(String.valueOf(bookings.size()), 13, cyan, true);
        count.setGravity(Gravity.CENTER);
        count.setBackground(round(Color.rgb(16, 40, 56), 30, 0xFF24536D));
        header.addView(count, new LinearLayout.LayoutParams(dp(38), dp(34)));

        Button refresh = button("↻", cyan, Color.rgb(3, 16, 22));
        LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(dp(42), dp(36));
        rp.setMargins(dp(8), 0, 0, 0);
        header.addView(refresh, rp);
        root.addView(header);

        status = label("Loading…", 12, muted, false);
        add(root, status, 0, 8);

        ScrollView scroll = new ScrollView(this);
        list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        scroll.addView(list);
        root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));

        refresh.setOnClickListener(v -> loadBookings(prefs.getString(KEY, ""), false));
        renderList();
    }

    private void renderList() {
        if (list == null) return;
        list.removeAllViews();
        if (bookings.isEmpty()) {
            TextView empty = label("No bookings yet\n\nNew repair requests will appear here automatically.", 15, muted, false);
            empty.setGravity(Gravity.CENTER);
            add(list, empty, 0, 80);
            return;
        }
        for (int i = 0; i < bookings.size(); i++) {
            final Booking b = bookings.get(i);
            Button row = new Button(this);
            row.setAllCaps(false);
            row.setGravity(Gravity.CENTER_VERTICAL | Gravity.START);
            row.setTextColor(text);
            row.setTextSize(15);
            row.setPadding(dp(12), dp(8), dp(12), dp(8));
            String preview = b.details == null ? "" : b.details.replace('\n', ' ');
            if (preview.length() > 60) preview = preview.substring(0, 57) + "…";
            row.setText((i + 1) + ".  " + safe(b.name) + "\n" + safe(b.service) + " • " + safe(b.serviceType) + "\n" + preview);
            row.setBackground(round(Color.rgb(12, 24, 34), 18, 0xFF1B3445));
            LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, dp(82));
            p.setMargins(0, 0, 0, dp(8));
            list.addView(row, p);
            row.setOnClickListener(v -> showDetail(b));
        }
    }

    private void showDetail(Booking b) {
        base();
        LinearLayout header = new LinearLayout(this);
        header.setGravity(Gravity.CENTER_VERTICAL);
        Button back = button("←  Back", Color.rgb(207, 231, 244), Color.rgb(12, 24, 34));
        header.addView(back, new LinearLayout.LayoutParams(dp(110), dp(44)));
        TextView ref = label(safe(b.reference), 11, muted, false);
        ref.setGravity(Gravity.END | Gravity.CENTER_VERTICAL);
        header.addView(ref, new LinearLayout.LayoutParams(0, dp(44), 1));
        root.addView(header);

        ScrollView scroll = new ScrollView(this);
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(18), dp(18), dp(18), dp(22));
        card.setBackground(round(panel, 20, 0xFF1B3445));

        TextView name = label(safe(b.name), 25, text, true);
        card.addView(name);
        TextView st = label(safe(b.status).toUpperCase(), 11, cyan, true);
        st.setPadding(dp(10), dp(6), dp(10), dp(6));
        st.setBackground(round(Color.rgb(18, 49, 69), 22, 0));
        add(card, st, 0, 16);

        addDetail(card, "SERVICE", b.service);
        addDetail(card, "SERVICE TYPE", b.serviceType);
        addDetail(card, "CONCERN / DETAILS", b.details);
        addDetail(card, "CONTACT METHOD", b.contactMethod);
        addDetail(card, "CONTACT", "Messenger".equalsIgnoreCase(b.contactMethod) ? b.messengerContact : b.contact);
        addDetail(card, "EMAIL", b.email);
        addDetail(card, "PREFERRED SCHEDULE", b.preferredSchedule);
        addDetail(card, "HOME SERVICE LOCATION", b.location());
        addDetail(card, "RECEIVED", b.createdAt);

        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        Button call = button("CALL", cyan, Color.rgb(3, 16, 22));
        Button msg = button("MESSENGER", cyan, Color.rgb(3, 16, 22));
        actions.addView(call, new LinearLayout.LayoutParams(0, dp(48), 1));
        LinearLayout.LayoutParams mp = new LinearLayout.LayoutParams(0, dp(48), 1);
        mp.setMargins(dp(8), 0, 0, 0);
        actions.addView(msg, mp);
        card.addView(actions);

        if (safe(b.contact).isEmpty()) call.setEnabled(false);
        call.setOnClickListener(v -> startActivity(new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + b.contact))));
        msg.setOnClickListener(v -> startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.facebook.com/MasterGuardOfficial"))));

        scroll.addView(card);
        root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));
        back.setOnClickListener(v -> showInbox());
    }

    private void addDetail(LinearLayout parent, String label, String value) {
        TextView l = label(label, 10, muted, true);
        l.setLetterSpacing(0.10f);
        parent.addView(l);
        TextView v = label(safe(value).isEmpty() ? "—" : value, 15, text, false);
        v.setPadding(0, dp(4), 0, dp(13));
        parent.addView(v);
    }

    private void loadBookings(String adminKey, boolean saveOnSuccess) {
        loadBookings(adminKey, saveOnSuccess, () -> {}, null);
    }

    private void loadBookings(String adminKey, boolean saveOnSuccess, Runnable finished, TextView message) {
        executor.execute(() -> {
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(API_URL).openConnection();
                c.setRequestMethod("GET");
                c.setRequestProperty("Authorization", "Bearer " + adminKey);
                c.setRequestProperty("Accept", "application/json");
                c.setConnectTimeout(15000);
                c.setReadTimeout(15000);
                int code = c.getResponseCode();
                BufferedReader reader = new BufferedReader(new InputStreamReader(code >= 400 ? c.getErrorStream() : c.getInputStream(), StandardCharsets.UTF_8));
                StringBuilder body = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) body.append(line);
                reader.close();
                c.disconnect();
                if (code < 200 || code >= 300) throw new Exception(parseError(body.toString(), "Request failed (" + code + ")"));
                JSONObject data = new JSONObject(body.toString());
                JSONArray arr = data.optJSONArray("bookings");
                List<Booking> next = new ArrayList<>();
                if (arr != null) for (int i = 0; i < arr.length(); i++) next.add(Booking.from(arr.getJSONObject(i)));
                runOnUiThread(() -> {
                    bookings.clear(); bookings.addAll(next);
                    if (saveOnSuccess) prefs.edit().putString(KEY, adminKey).apply();
                    showInbox();
                    finished.run();
                });
            } catch (Exception e) {
                runOnUiThread(() -> {
                    if (message != null) message.setText(e.getMessage() == null ? "Unable to connect." : e.getMessage());
                    if (status != null) status.setText("Connection error: " + (e.getMessage() == null ? "Unable to connect" : e.getMessage()));
                    finished.run();
                });
            }
        });
    }

    private String parseError(String body, String fallback) {
        try { return new JSONObject(body).optString("error", fallback); } catch (Exception ignored) { return fallback; }
    }

    @Override protected void onDestroy() { super.onDestroy(); executor.shutdownNow(); }

    private Button button(String s, int bgColor, int fg) {
        Button b = new Button(this);
        b.setText(s); b.setTextColor(fg); b.setTextSize(13); b.setAllCaps(false);
        b.setBackground(round(bgColor, 14, 0));
        return b;
    }

    private TextView label(String s, float size, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setText(s); t.setTextSize(size); t.setTextColor(color);
        if (bold) t.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        return t;
    }

    private void add(LinearLayout parent, View v, int width, int top) {
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(width == 0 ? -1 : width, -2);
        p.topMargin = dp(top); parent.addView(v, p);
    }

    private android.graphics.drawable.GradientDrawable round(int fill, int radius, int stroke) {
        android.graphics.drawable.GradientDrawable d = new android.graphics.drawable.GradientDrawable();
        d.setColor(fill); d.setCornerRadius(dp(radius));
        if (stroke != 0) d.setStroke(dp(1), stroke);
        return d;
    }

    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }
    private String safe(String s) { return s == null ? "" : s.trim(); }

    static class Booking {
        String reference, name, contact, contactMethod, messengerContact, email, service, serviceType, preferredSchedule, details, status, createdAt;
        double lat, lng; boolean hasLocation; int accuracy;
        static Booking from(JSONObject o) {
            Booking b = new Booking();
            b.reference=o.optString("reference"); b.name=o.optString("name"); b.contact=o.optString("contact"); b.contactMethod=o.optString("contact_method"); b.messengerContact=o.optString("messenger_contact");
            b.email=o.optString("email"); b.service=o.optString("service"); b.serviceType=o.optString("service_type"); b.preferredSchedule=o.optString("preferred_schedule"); b.details=o.optString("details"); b.status=o.optString("status", "New"); b.createdAt=o.optString("created_at");
            if (!o.isNull("latitude") && !o.isNull("longitude")) { b.hasLocation=true; b.lat=o.optDouble("latitude"); b.lng=o.optDouble("longitude"); b.accuracy=o.optInt("accuracy"); }
            return b;
        }
        String location() { return hasLocation ? lat + ", " + lng + (accuracy > 0 ? " (±" + accuracy + "m)" : "") : "Not shared"; }
    }
}
