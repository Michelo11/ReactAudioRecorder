import { Microphone } from "@mozartec/capacitor-microphone";
import { useState, useCallback } from "react";

export interface recorderControls {
  startRecording: () => void;
  stopRecording: () => void;
  recordingBlob?: Blob;
  isRecording: boolean;
  recordingTime: number;
}

export type MediaAudioTrackConstraints = Pick<
  MediaTrackConstraints,
  | "deviceId"
  | "groupId"
  | "autoGainControl"
  | "channelCount"
  | "echoCancellation"
  | "noiseSuppression"
  | "sampleRate"
  | "sampleSize"
>;

/**
 * @returns Controls for the recording. Details of returned controls are given below
 *
 * @param `audioTrackConstraints`: Takes a {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackSettings#instance_properties_of_audio_tracks subset} of `MediaTrackConstraints` that apply to the audio track
 * @param `onNotAllowedOrFound`: A method that gets called when the getUserMedia promise is rejected. It receives the DOMException as its input.
 *
 * @details `startRecording`: Calling this method would result in the recording to start. Sets `isRecording` to true
 * @details `stopRecording`: This results in a recording in progress being stopped and the resulting audio being present in `recordingBlob`. Sets `isRecording` to false
 * @details `togglePauseResume`: Calling this method would pause the recording if it is currently running or resume if it is paused. Toggles the value `isPaused`
 * @details `recordingBlob`: This is the recording blob that is created after `stopRecording` has been called
 * @details `isRecording`: A boolean value that represents whether a recording is currently in progress
 * @details `isPaused`: A boolean value that represents whether a recording in progress is paused
 * @details `recordingTime`: Number of seconds that the recording has gone on. This is updated every second
 * @details `mediaRecorder`: The current mediaRecorder in use
 */
const useAudioRecorder: (
  audioTrackConstraints?: MediaAudioTrackConstraints,
  onNotAllowedOrFound?: (exception: DOMException) => void
) => recorderControls = (audioTrackConstraints, onNotAllowedOrFound) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout>();
  const [recordingBlob, setRecordingBlob] = useState<Blob>();

  const _startTimer: () => void = useCallback(() => {
    const interval = setInterval(() => {
      setRecordingTime((time) => time + 1);
    }, 1000);
    setTimerInterval(interval);
  }, [setRecordingTime, setTimerInterval]);

  const _stopTimer: () => void = useCallback(() => {
    timerInterval != null && clearInterval(timerInterval);
    setTimerInterval(undefined);
  }, [timerInterval, setTimerInterval]);

  /**
   * Calling this method would result in the recording to start. Sets `isRecording` to true
   */
  const startRecording: () => void = useCallback(() => {
    if (timerInterval != null) return;

    Microphone.requestPermissions()
      .then(async () => {
        setIsRecording(true);
        await Microphone.startRecording();
        _startTimer();
      })
      .catch((err: DOMException) => {
        console.log(err.name, err.message, err.cause);
        onNotAllowedOrFound?.(err);
      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    timerInterval,
    setIsRecording,
    _startTimer,
    setRecordingBlob,
    onNotAllowedOrFound,
  ]);

  /**
   * Calling this method results in a recording in progress being stopped and the resulting audio being present in `recordingBlob`. Sets `isRecording` to false
   */
  const stopRecording: () => void = useCallback(async () => {
    const res = await Microphone.stopRecording();
    _stopTimer();
    setRecordingTime(0);
    setIsRecording(false);

    if (!res.base64String) return;

    setRecordingBlob(new Blob([res.base64String], { type: "audio/m4a" }));
  }, [setRecordingTime, setIsRecording, _stopTimer]);

  return {
    startRecording,
    stopRecording,
    recordingBlob,
    isRecording,
    recordingTime,
  };
};

export default useAudioRecorder;
