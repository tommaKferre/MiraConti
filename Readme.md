# MiraConti — App per le spese mensili (PWA)

Piccola app PWA per tenere traccia delle spese, funzionante offline e senza backend.

Caratteristiche principali
- Interfaccia mobile-first pulita e intuitiva con pulsanti grandi
- Aggiunta rapida tramite pulsante flottante (FAB) e form in modal/slide-up
- Modifica spese (tap su una spesa per modificarla)
- Navigazione mese: usa le frecce per cambiare mese
- Eliminazione con undo tramite toast
- Animazioni: modal e toast con piccoli effetti fade/slide per un aspetto più app-like
- Inserimento rapido di spese: importo, data, categoria, metodo, nota opzionale
- Filtri: per mese, categoria e metodo
- Riepiloghi: totale mese e totale per metodo
- Persistenza: LocalStorage (i dati rimangono anche riavviando il telefono)
- Export / Import JSON
- Installabile come PWA (manifest + service worker)

Avvio locale (sviluppo / test)

1. Apri un terminale nella cartella del progetto `MiraConti`.
2. Per testare il service worker (richiede server), usa un server statico semplice:

```bash
# con Python 3
python -m http.server 8000

# oppure, se preferisci (Node.js)
npx http-server -c-1 .
```

3. Apri nel browser sul PC `http://localhost:8000`.

Come installare l'app sul telefono

Opzione A — Local (rete Wi‑Fi):
- Avvia il server sul PC (vedi sopra).
- Individua l'indirizzo IP del PC nella rete (es. `192.168.1.5`).
- Sullo smartphone connesso alla stessa Wi‑Fi, apri il browser e visita `http://<PC-IP>:8000` (es. `http://192.168.1.5:8000`).
- Apri il menu del browser (su Chrome: "Aggiungi a schermata Home" / "Installa app").

Opzione B — Pubblicazione (consigliata per uso quotidiano):
- Carica il contenuto della cartella su GitHub e abilita GitHub Pages, oppure caricalo su un hosting statico (Netlify, Vercel, ecc.).
- Apri l'URL pubblico su mobile e usa l'opzione "Aggiungi a schermata Home".

Nota sul funzionamento offline
- Dopo la prima visita (mentre sei online) il service worker scarica le risorse principali: l'app funzionerà offline e l'installazione come PWA sarà possibile.

Import/Export dati
- Esporta: clicca su "Esporta JSON" per scaricare un file contenente tutte le spese.
- Importa: usa il pulsante "Importa JSON" per sostituire i dati attuali con quelli del file (verifica il formato JSON prima di importare).

Struttura dati
- LocalStorage key: `miraContiExpenses_v1`
- Formato: array di oggetti { id, amount, date (ISO), category, method, note }

Se vuoi, posso aiutarti a pubblicare l'app su GitHub Pages o configurare un piccolo server per accederla dal telefono. Fammi sapere quale opzione preferisci.
