import type { ReactElement } from "react";
import React, { useState, useEffect } from "react";
import type { Props } from "./interfaces";
import useAudioRecorder from "../hooks/useAudioRecorder";

import micSVG from "../icons/mic.svg";
import saveSVG from "../icons/save.svg";
import stopSVG from "../icons/stop.svg";
import discardSVG from "../icons/discard.svg";
import "../styles/audio-recorder.css";

/**
 * Usage: https://github.com/samhirtarif/react-audio-recorder#audiorecorder-component
 *
 *
 * @prop `onRecordingComplete` Method that gets called when save recording option is clicked
 * @prop `recorderControls` Externally initilize hook and pass the returned object to this param, this gives your control over the component from outside the component.
 * https://github.com/samhirtarif/react-audio-recorder#combine-the-useaudiorecorder-hook-and-the-audiorecorder-component
 * @prop `audioTrackConstraints`: Takes a {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackSettings#instance_properties_of_audio_tracks subset} of `MediaTrackConstraints` that apply to the audio track
 * @prop `onNotAllowedOrFound`: A method that gets called when the getUserMedia promise is rejected. It receives the DOMException as its input.
 * @prop `downloadOnSavePress` If set to `true` the file gets downloaded when save recording is pressed. Defaults to `false`
 * @prop `downloadFileExtension` File extension for the audio filed that gets downloaded. Defaults to `mp3`. Allowed values are `mp3`, `wav` and `webm`
 * @prop `showVisualizer` Displays a waveform visualization for the audio when set to `true`. Defaults to `false`
 * @prop `classes` Is an object with attributes representing classes for different parts of the component
 */
const AudioRecorder: (props: Props) => ReactElement = ({
  onRecordingComplete,
  onNotAllowedOrFound,
  recorderControls,
  audioTrackConstraints,
  downloadOnSavePress = false,
  downloadFileExtension = "webm",
  classes,
}: Props) => {
  const {
    startRecording,
    stopRecording,
    recordingBlob,
    isRecording,
    recordingTime,
  } =
    recorderControls ??
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAudioRecorder(audioTrackConstraints, onNotAllowedOrFound);

  const [shouldSave, setShouldSave] = useState(false);

  const stopAudioRecorder: (save?: boolean) => void = (
    save: boolean = true
  ) => {
    setShouldSave(save);
    stopRecording();
  };

  const convertToDownloadFileExtension = async (
    webmBlob: Blob
  ): Promise<Blob> => {
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const ffmpeg = new FFmpeg();
    await ffmpeg.load();

    const inputName = "input.webm";
    const outputName = `output.${downloadFileExtension}`;

    await ffmpeg.writeFile(
      inputName,
      new Uint8Array(await webmBlob.arrayBuffer())
    );

    await ffmpeg.exec(["-i", inputName, outputName]);

    const outputData = (await ffmpeg.readFile(outputName)) as Uint8Array;
    const outputBlob = new Blob([outputData.buffer as BlobPart], {
      type: `audio/${downloadFileExtension}`,
    });

    return outputBlob;
  };

  const downloadBlob = async (blob: Blob): Promise<void> => {
    if (!crossOriginIsolated && downloadFileExtension !== "webm") {
      console.warn(
        `This website is not "cross-origin isolated". Audio will be downloaded in webm format, since mp3/wav encoding requires cross origin isolation. Please visit https://web.dev/cross-origin-isolation-guide/ and https://web.dev/coop-coep/ for information on how to make your website "cross-origin isolated"`
      );
    }

    const downloadBlob = crossOriginIsolated
      ? await convertToDownloadFileExtension(blob)
      : blob;
    const fileExt = crossOriginIsolated ? downloadFileExtension : "webm";
    const url = URL.createObjectURL(downloadBlob);

    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = `audio.${fileExt}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  useEffect(() => {
    if (shouldSave && recordingBlob != null && onRecordingComplete != null) {
      onRecordingComplete(recordingBlob);
      if (downloadOnSavePress) {
        void downloadBlob(recordingBlob);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingBlob]);

  return (
    <div
      className={`audio-recorder ${isRecording ? "recording" : ""} ${
        classes?.AudioRecorderClass ?? ""
      }`}
      data-testid="audio_recorder"
    >
      <img
        src={isRecording ? saveSVG : micSVG}
        className={`audio-recorder-mic ${
          classes?.AudioRecorderStartSaveClass ?? ""
        }`}
        onClick={isRecording ? () => stopAudioRecorder() : startRecording}
        data-testid="ar_mic"
        title={isRecording ? "Save recording" : "Start recording"}
      />
      {isRecording && (
        <img
          src={discardSVG}
          className={`audio-recorder-options ${
            !isRecording ? "display-none" : ""
          } ${classes?.AudioRecorderDiscardClass ?? ""}`}
          onClick={() => stopAudioRecorder(false)}
          title="Discard Recording"
          data-testid="ar_cancel"
        />
      )}
      <span
        className={`audio-recorder-timer ${
          !isRecording ? "display-none" : ""
        } ${classes?.AudioRecorderTimerClass ?? ""}`}
        data-testid="ar_timer"
      >
        {Math.floor(recordingTime / 60)}:
        {String(recordingTime % 60).padStart(2, "0")}
      </span>
      <span
        className={`audio-recorder-visualizer ${
          !isRecording ? "display-none" : ""
        }`}
      >
        <span
          className={`audio-recorder-status ${
            !isRecording ? "display-none" : ""
          } ${classes?.AudioRecorderStatusClass ?? ""}`}
        >
          <span className="audio-recorder-status-dot"></span>
          Recording
        </span>
      </span>
      <img
        src={stopSVG}
        className={`audio-recorder-options ${
          !isRecording ? "display-none" : ""
        } ${classes?.AudioRecorderDiscardClass ?? ""}`}
        onClick={() => stopAudioRecorder(true)}
        title="Stop Recording"
        data-testid="ar_cancel"
      />
    </div>
  );
};

export default AudioRecorder;
