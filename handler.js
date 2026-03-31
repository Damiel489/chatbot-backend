const supabase = require('./supabase')
const { parseText } = require('./gemini')

const jurusanMap = {
  "1": "RPL",
  "2": "TKJ"
}

const generalIntent = ["halo", "hai", "info", "tanya", "ppdb"]

module.exports = async function handleMessage(client, message) {
  try {
    const text = message.body.toLowerCase()
    const from = message.from
    const now = new Date()

    console.log("PESAN:", text, "DARI:", from)

    // =========================
    // CEK SESSION
    // =========================
    const { data: session } = await supabase
      .from('session_user')
      .select('*')
      .eq('nomor_wa', from)
      .single()

    // =========================
    // GENERAL INTENT → BROSUR (1x per hari)
    // =========================
    if (generalIntent.some(k => text.includes(k))) {

      let bolehKirim = true

      if (session && session.last_brosur) {
        const today = now.toISOString().slice(0, 10)
        const last = new Date(session.last_brosur).toISOString().slice(0, 10)

        if (today === last) {
          bolehKirim = false
        }
      }

      if (bolehKirim) {
        await client.sendImage(
          from,
          "https://rlnyofcslojmnfzlswhz.supabase.co/storage/v1/object/sign/folder_ppdb/images.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV80N2VjYzA1NC1hNDQ5LTQxZDAtOWI3Mi0wNTEzMzJlYWM4YTkiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJmb2xkZXJfcHBkYi9pbWFnZXMuanBnIiwiaWF0IjoxNzc0ODc5MDQyLCJleHAiOjE4MDY0MTUwNDJ9.qBA9-mgaCuNqVSjBAST-gPI7_HwYW54PcerPO3T6RGc",
          "brosur.jpg",
          "Berikut brosur PPDB sekolah kami 📄"
        )

        await supabase.from('session_user').upsert({
          nomor_wa: from,
          last_brosur: now
        })
      }

      await client.sendText(from,
        "Silakan ketik daftar untuk mendaftar atau tanyakan hal lain ya 😊"
      )

      return
    }

    // =========================
    // START DAFTAR
    // =========================
    if (text === "daftar") {
      await supabase.from('session_user').upsert({
        nomor_wa: from,
        step: 'nama'
      })

      await client.sendText(from, "Masukkan nama lengkap:")
      return
    }

    // =========================
    // FLOW PPDB
    // =========================
    if (session && session.step) {

      // ===== NAMA =====
      if (session.step === "nama") {

        if (message.body.length < 3) {
          await client.sendText(from, "Nama tidak valid")
          return
        }

        await supabase.from('pendaftaran').upsert({
          nomor_wa: from,
          nama: message.body
        })

        await supabase.from('session_user')
          .update({ step: 'tanggal_lahir' })
          .eq('nomor_wa', from)

        await client.sendText(from, "Masukkan tanggal lahir (DD-MM-YYYY):")
        return
      }

      // ===== TANGGAL =====
      if (session.step === "tanggal_lahir") {

        if (!message.body.includes("-")) {
          await client.sendText(from, "Format salah. Gunakan DD-MM-YYYY")
          return
        }

        await supabase.from('pendaftaran')
          .update({ tanggal_lahir: message.body })
          .eq('nomor_wa', from)

        await supabase.from('session_user')
          .update({ step: 'sekolah' })
          .eq('nomor_wa', from)

        await client.sendText(from, "Masukkan asal sekolah:")
        return
      }

      // ===== SEKOLAH =====
      if (session.step === "sekolah") {

        await supabase.from('pendaftaran')
          .update({ asal_sekolah: message.body })
          .eq('nomor_wa', from)

        await supabase.from('session_user')
          .update({ step: 'alamat' })
          .eq('nomor_wa', from)

        await client.sendText(from, "Masukkan alamat:")
        return
      }

      // ===== ALAMAT =====
      if (session.step === "alamat") {

        await supabase.from('pendaftaran')
          .update({ alamat: message.body })
          .eq('nomor_wa', from)

        await supabase.from('session_user')
          .update({ step: 'jurusan' })
          .eq('nomor_wa', from)

        await client.sendText(from,
          "Pilih jurusan:\n1. RPL\n2. TKJ\n\nKetik angka (contoh: 1)"
        )
        return
      }

      // ===== JURUSAN =====
      if (session.step === "jurusan") {

        if (!jurusanMap[text]) {
          await client.sendText(from, "Pilihan tidak valid. Ketik 1 atau 2")
          return
        }

        await supabase.from('pendaftaran')
          .update({ jurusan: jurusanMap[text] })
          .eq('nomor_wa', from)

        await supabase.from('session_user')
          .update({ step: 'ortu' })
          .eq('nomor_wa', from)

        await client.sendText(from, "Masukkan nomor orang tua:")
        return
      }

      // ===== ORTU =====
      if (session.step === "ortu") {

        if (isNaN(message.body)) {
          await client.sendText(from, "Nomor harus angka")
          return
        }

        await supabase.from('pendaftaran')
          .update({ nomor_ortu: message.body })
          .eq('nomor_wa', from)

        await supabase.from('session_user')
          .delete()
          .eq('nomor_wa', from)

        await client.sendText(from,
          "Pendaftaran selesai! Data kamu sudah tersimpan."
        )

        return
      }
    }

    // =========================
    // FAQ DATABASE
    // =========================
    const { data: faqs } = await supabase.from('faq').select('*')

    for (let faq of faqs || []) {
      if (text.includes(faq.keyword)) {

        if (faq.gambar_url) {
          await client.sendImage(from, faq.gambar_url, "brosur.jpg", faq.jawaban)
        } else {
          await client.sendText(from, faq.jawaban)
        }

        return
      }
    }

    // =========================
    // GEMINI FALLBACK
    // =========================
    const ai = await parseText(message.body)
    await client.sendText(from, ai)

  } catch (err) {
    console.log("ERROR:", err)
  }
}