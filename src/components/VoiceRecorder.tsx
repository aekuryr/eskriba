const startRecording = async () => {
  // No inicies si ya estás iniciando o grabando
  if (isStartingRef.current || isRecording) return;
  isStartingRef.current = true;

  try {
    // 1) Solicitar micro con algunas “hints” que ayudan en Chrome
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: false,
        autoGainControl: false,
      } as MediaTrackConstraints,
    });
    streamRef.current = stream;

    // Diagnóstico: si el track termina, lo sabremos
    const track = stream.getAudioTracks()[0];
    track.addEventListener('ended', () => {
      console.warn('[MediaStreamTrack] ended');
    });

    // 2) MediaRecorder
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
      // audioBitsPerSecond: 128000, // opcional
    });
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (evt) => {
      if (evt.data && evt.data.size > 0) {
        audioChunksRef.current.push(evt.data);
      }
    };

    mediaRecorder.onerror = (e) => {
      console.error('[MediaRecorder] onerror:', e);
    };

    mediaRecorder.onpause = () => console.log('[MediaRecorder] pause');
    mediaRecorder.onresume = () => console.log('[MediaRecorder] resume');

    mediaRecorder.onstop = () => {
      console.log('[MediaRecorder] stop; chunks:', audioChunksRef.current.length);
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch (e) {
        console.error('Error creando blob/URL de audio:', e);
        setAudioUrl(null);
      } finally {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      }
    };

    // ⬅️ CLAVE: usar timeslice para forzar dataavailable cada 1 s
    mediaRecorder.start(1000);
    setIsRecording(true);

    // 3) Arrancar reconocimiento en vivo con un pequeño delay
    setFinalText('');
    setInterimText('');
    setTimeout(() => {
      // Si el usuario alcanzó a detener, no sigas
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
        isStartingRef.current = false;
        return;
      }
      recoStopRef.current = transcriptionService.startRecognition(
        (r) => {
          if (r.isFinal) {
            setFinalText((prev) => {
              const next = (prev ? prev + ' ' : '') + r.text.trim();
              onTranscriptionComplete(next + (interimText ? ' ' + interimText : ''));
              return next;
            });
            setInterimText('');
          } else {
            setInterimText(r.text.trim());
            onTranscriptionComplete(finalText + (r.text ? ' ' + r.text.trim() : ''));
          }
        },
        (msg) => console.warn('Reconocimiento:', msg),
        undefined,
        { language: 'es-ES', continuous: true, interimResults: true }
      );
      isStartingRef.current = false;
    }, 250);
  } catch (err) {
    console.error('Error al iniciar la grabación:', err);
    alert('No se pudo acceder al micrófono. Revisa permisos del navegador.');
    isStartingRef.current = false;
    setIsRecording(false);
    // Limpieza por si algo quedó a medias
    try { transcriptionService.stopRecognition(); } catch {}
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    } catch {}
  }
};
