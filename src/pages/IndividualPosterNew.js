import React from "react";
import InputColor from "react-input-color";
import Dropzone from "react-dropzone";
import ClipLoader from "react-spinners/ClipLoader";
import { Link } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";

import "react-circular-progressbar/dist/styles.css";
import "react-toastify/dist/ReactToastify.css";

import { Subject } from "rxjs";
import { debounceTime } from "rxjs/operators";
import axios from "axios";
import * as Vibrant from "node-vibrant";
import queryString from "query-string";

// animation
import { easeQuad } from "d3-ease";

// components
import PNGDownload from "../components/PNGDownload";
import VibrantPalette from "../components/VibrantPalette.js";
import ChangingProgressProvider from "../components/ChangingProgressProvider.js";

// internal helpers
import visualCenter from "../helpers/visualCenter.js";
import * as textFit from "../helpers/textFit.js";
import trimCanvas from "../helpers/trimCanvas.js";
import { useCanvas, rgbToHex, hexToRgb } from "../helpers/pickColor.js";
import {
  acceptPoster,
  fetchPlayerData,
  fetchPosterData,
} from "../helpers/posterManagement";
import { base64EncArr, base64DecToArr } from "../helpers/base64Helper.js";

// assets
import demoImage from "../assets/img/demo.js";
import UpArrow from "../assets/svg/up-arrow.svg";
import MoveUp from "../assets/svg/move-up.svg";
import ClearImageIcon from "../assets/img/clear-image-icon.png";
import LeftRightControls from "../components/LeftRightControls";
import config from "../config";

const predefinedColors = {
  Blue: "#275BD6",
  Red: "#D61E21",
  Navy: "#020F70",
  Purple: "#943BD9",
  Maroon: "#7D0909",
  "Vegas Gold": "#BFA88F",
  Green: "#24B519",
  Orange: "#E3841E",
  Yellow: "#D9B93B",
  Gray: "#A8A8A5",
};

class IndividualPosterNew extends React.Component {
  constructor(props) {
    super(props);

    this.firstNamePG = null;
    this.secondNamePG = null;
    this.thirdNamePG = null;

    this.setFirstNamePG = (element) => {
      this.firstNamePG = element;
    };

    this.setSecondNamePG = (element) => {
      this.secondNamePG = element;
    };

    this.setThirdNamePG = (element) => {
      this.thirdNamePG = element;
    };

    this.state = {
      isAuto: false, // required for auto build
      playerId: 0, // required for auto build
      base64: [null, null, null],
      backgroundMode: "black",
      bgRemoved: [true, true, true],
      bgRemoving: [false, false, false],
      bgRemovingBtnText: ["Modify", "Modify", "Remove bg"],
      images: [null, null, null],
      originLinks: ["", "", ""], //s3 links to original images
      pickerImagePath: "",
      imageFileNames: ["", "", ""], // without Extension
      imageBaseNames: ["", "", ""], // with Extension,

      imageCMInfos: [
        // image information obtained through ClippingMagic tool
        { id: null, secret: null },
        { id: null, secret: null },
        { id: null, secret: null },
      ],

      palette: {}, // vibrant.js

      producedImage: null,
      visualPos: [
        // visual center positions
        {
          visualLeft: 0.5,
          visualTop: 0.5,
        },
        {
          visualLeft: 0.5,
          visualTop: 0.5,
        },
        {
          visualLeft: 0.5,
          visualTop: 0.5,
        },
      ],

      elementsPos: {},

      sport: "hockey",

      headerCopy: "2020",

      playerNum: 55,
      playerNumStroke: "rgb(200,12,0)",

      tintColor: "Blue",
      tintColorMode: 1, // means using predefined Colors
      tintColorValue: "#275BD6",
      originTintColorValue: "#000000", // tint color that suggested on the event system (automation purpose)

      firstName: "Buffalo",
      firstNameSize: 100,
      firstNameMaxSize: 100,
      firstNameColor: "#00008B",
      firstNameFamily: "Amigos",

      secondName: "REGALS",
      secondNameSize: 125,
      secondNameMaxSize: 100,
      secondNameColor: "#E91205",
      secondNameFamily: "Freshman",

      headerCopyColor: "#00008B",
      footerCopyColor: "#00008B",

      // for WRESTLING
      thirdName: "COLTEN",
      thirdNameSize: null, // should be null so that thirdName line can be hidden for the other sports page
      thirdNameMaxSize: 100,
      thirdNameColor: "rgb(23,39,17)",
      thirdNameFamily: "Freshman",

      footerCopy: "HOCKEY SEASON",

      productLoading: false,
      percentPoints: [],
      estimatedTime: 12,
      playerImageWidth: 670,

      productUniqueId: "",
      productAccepting: false,

      playerImageScaleMode: "Contain", // Contain
      copyTooltipText: "Copy to clipboard",

      acceptedFormData: null,
    };

    this.serializableStateKeys = [
      "backgroundMode",
      "headerCopy",
      "footerCopy",
      "playerNum",
      "playerNumStroke",
      "firstName",
      "firstNameColor",
      "firstNameSize",
      "firstNameFamily",
      "secondName",
      "secondNameColor",
      "secondNameSize",
      "secondNameFamily",
      "thirdName",
      "thirdNameColor",
      "thirdNameSize",
      "thirdNameFamily",
      "tintColor",
      "playerImageWidth",
      "tintColorValue",
      "headerCopyColor",
      "footerCopyColor",
    ];

    this.API_BASE_URL = config.apiUrl;
    this.API_BASE_URL1 = config.apiUrl1;

    this.onFNameChange$ = new Subject();
    this.onFNameChange = this.onFNameChange.bind(this);

    this.onSNameChange$ = new Subject();
    this.onSNameChange = this.onSNameChange.bind(this);

    this.onTNameChange$ = new Subject();
    this.onTNameChange = this.onTNameChange.bind(this);
  }

  async componentDidMount() {
    const routeParams = queryString.parse(this.props.location.search);

    // set placeholder images
    this.setState({
      base64: new Array(3).fill(demoImage),
      isAuto: false,
      playerId: 0,
    });

    // if player_id is available in the URI param, load player data
    if (routeParams.player_id) {
      await this.loadPlayer(routeParams.player_id, !!routeParams.auto);
    } else if (routeParams.poster_id) {
      await this.loadPoster(routeParams.poster_id);
    } else {
      // load sport's initial config
      this.setState(await this.fetchSportConfig("hockey"));
    }

    this.determineFirstNameMaxSize();
    this.determineSecondNameMaxSize();
    this.determineThirdNameMaxSize();

    this.fnSubscription = this.onFNameChange$
      .pipe(debounceTime(300))
      .subscribe((_) => {
        this.determineFirstNameMaxSize();
      });

    this.snSubscription = this.onSNameChange$
      .pipe(debounceTime(300))
      .subscribe((_) => {
        this.determineSecondNameMaxSize();
      });

    this.tnSubscription = this.onTNameChange$
      .pipe(debounceTime(300))
      .subscribe((_) => {
        this.determineThirdNameMaxSize();
      });
  }

  componentWillUnmount() {
    if (this.fnSubscription) {
      this.fnSubscription.unsubscribe();
    }

    if (this.snSubscription) {
      this.snSubscription.unsubscribe();
    }

    if (this.tnSubscription) {
      this.tnSubscription.unsubscribe();
    }
  }

  async loadPoster(productUniqueId) {
    // show toast notification
    toast.info("Loading poster ...", {
      position: toast.POSITION.TOP_CENTER,
    });

    const posterData = await fetchPosterData(productUniqueId);

    console.log(`loaded poster ${productUniqueId}`, posterData);
    this.setState({
      ...posterData,
      productUniqueId,
    });
  }

  async loadPlayer(playerId, automate = false) {
    // show toast notification
    toast.info("Loading images ...", {
      position: toast.POSITION.TOP_CENTER,
    });

    const playerData = await fetchPlayerData(playerId);
    const sportConfig = await this.fetchSportConfig(playerData.sport);
    console.log(`playerData ${playerId}`, playerData);

    this.setState({
      ...sportConfig,
      ...playerData,
      base64: playerData.images.map((t) => (t.link ? t.base64 : demoImage)),
      isAuto: automate,
      originLinks: playerData.images.map((t) => (!!t.link ? t.link : "")),
      originTintColorValue: playerData.tintColorValue,
      playerId,
    });

    // convert base64 to blob, and pass it to main handler
    playerData.images
      .map((t) => t.base64)
      .map((b64) => {
        const type = b64.match(/^data:(image\/[a-z]+);base64,/);
        return !type
          ? null
          : new Blob(
              [
                base64DecToArr(
                  b64.replace(/^data:image\/[a-z]+;base64,/, ""),
                  2
                ),
              ],
              {
                type: type.slice(-1).pop(),
              }
            );
      })
      .map((blob, idx) => {
        this.onReadUrlHandler(blob, playerData.images[idx].baseName, idx);
      });
  }

  async fetchSportConfig(sport) {
    // API UPDATE
    const response = await fetch(
      `${this.API_BASE_URL}/product/individual/${sport}`
    );
    const json = await response.json();

    if (json.statusCode !== 200) {
      throw new Error(`${json.error.type} : ${json.error.description}`);
    }

    const { data } = json;

    data.tintColorValue = predefinedColors[data.tintColor];
    data.elementsPos = data.elementsPos || {};
    data.sport = sport;

    if (!Object.keys(data).find((e) => e === "playerNum"))
      data.playerNum = null;
    if (!Object.keys(data).find((e) => e === "thirdNameSize"))
      data.thirdNameSize = null;

    if (data.playerImageWidth === 670) data.playerImageScaleMode = "Contain";
    else if (data.playerImageWidth === 900) data.playerImageScaleMode = "Cover";
    else data.playerImageScaleMode = "Manual";

    return data;
  }

  onFNameChange(e) {
    const name = e.target.value;
    this.setState({ firstName: name });
    this.onFNameChange$.next(name);
  }

  onSNameChange(e) {
    const name = e.target.value;
    this.setState({ secondName: name });
    this.onSNameChange$.next(name);
  }

  onTNameChange(e) {
    const name = e.target.value;
    this.setState({ thirdName: name });
    this.onTNameChange$.next(name);
  }

  sleep = (m) => new Promise((r) => setTimeout(r, m));

  determineFirstNameMaxSize() {
    if (!!this.firstNamePG === false) return;
    textFit(this.firstNamePG, { alignHoriz: true, maxFontSize: 300 });

    const style = window
      .getComputedStyle(
        document.querySelector(".first-name-playground > .textFitted"),
        null
      )
      .getPropertyValue("font-size");
    const maxSize = parseInt(style);

    this.setState({
      firstNameMaxSize: maxSize,
      firstNameSize:
        this.state.firstNameSize > maxSize ? maxSize : this.state.firstNameSize,
    });
  }

  determineSecondNameMaxSize() {
    if (!!this.secondNamePG === false) return;
    textFit(this.secondNamePG, { alignHoriz: true, maxFontSize: 300 });

    const style = window
      .getComputedStyle(
        document.querySelector(".second-name-playground > .textFitted"),
        null
      )
      .getPropertyValue("font-size");

    const maxSize = parseInt(style);
    this.setState({
      secondNameMaxSize: maxSize,
      secondNameSize:
        this.state.secondNameSize > maxSize
          ? maxSize
          : this.state.secondNameSize,
    });
  }

  determineThirdNameMaxSize() {
    if (!!this.thirdNamePG === false) return;
    textFit(this.thirdNamePG, { alignHoriz: true, maxFontSize: 300 });

    const style = window
      .getComputedStyle(
        document.querySelector(".third-name-playground > .textFitted"),
        null
      )
      .getPropertyValue("font-size");

    const maxSize = parseInt(style);
    this.setState({
      thirdNameMaxSize: maxSize,
      thirdNameSize:
        this.state.thirdNameSize > maxSize ? maxSize : this.state.thirdNameSize,
    });
  }

  async processAutoClipping(rawData, s3Link, fileName) {
    const formData = new FormData();

    if (s3Link) {
      formData.append("link", s3Link);
    } else {
      formData.append("file", rawData, fileName);
    }

    const config = {
      headers: {
        "content-type": "multipart/form-data",
      },
    };

    // API UPDATE
    return await axios.post(`${this.API_BASE_URL1}`, formData, config);
  }

  processClippedImage(imageId, idx) {
    /* download and show */
    const formData = new FormData();

    formData.append("imageid", imageId);
    formData.append("download", true);

    const config = {
      headers: {
        "content-type": "multipart/form-data",
      },
    };

    // before downloading, show the loading animator
    this.setState({
      bgRemoving: this.state.bgRemoving.map((f, i) => (i === idx ? true : f)),
    });

    // API UPDATE
    axios
      .post(`${this.API_BASE_URL}/clipping/download`, formData, config)
      .then(({ data }) => {
        if (data.statusCode !== 200) {
          console.log(
            `Error on processClippedImage(): ${data.error.type} : ${data.error.description}`
          );
          return;
        }
        this.processClippingMagicResultImage(idx, data.data.base64);
      });
  }

  showClippingMagicEditingTool(idx) {
    const cmInfo = this.state.imageCMInfos[idx];
    if (!cmInfo.id || !cmInfo.secret) return;

    // hide the loading animator
    this.setState({
      bgRemoving: this.state.bgRemoving.map((f, i) => (i === idx ? false : f)),
    });

    // open the clippingMagic editing tool
    window.ClippingMagic.edit(
      {
        image: {
          id: cmInfo.id,
          secret: cmInfo.secret,
        },
        locale: "en-US",
      },
      (opts) => {
        if (opts.event === "result-generated") {
          console.log("result-generated");

          // download the result image
          this.processClippedImage(cmInfo.id, idx);
        }
      }
    );
  }

  // remove logo bg by auto clipping
  async removeLogoBg(evt) {
    const {
      images,
      bgRemoving,
      imageCMInfos,
      originLinks,
      imageBaseNames,
    } = this.state;
    evt.stopPropagation();

    if (!images[2]) return;

    // before API call, start loading animator
    this.setState({
      bgRemoving: bgRemoving.map((f, i) => (i === 2 ? true : f)),
      imageCMInfos: imageCMInfos.map((f, i) =>
        i === 2 ? { id: null, secret: null } : f
      ),
    });

    try {
      // get base64 of auto clipped image
      const { data } = await this.processAutoClipping(
        images[2],
        originLinks[2],
        imageBaseNames[2]
      );

      if (data.statusCode !== 200) {
        throw new Error(`${data.error.type} : ${data.error.description}`);
      }

      // download image, get base64, and show image
      this.processClippingMagicResultImage(2, data.data.base64);
    } catch (err) {
      console.log("Error on removeLogoBg(): ", err);

      this.setState({
        bgRemoving: this.state.bgRemoving.map((f, i) => (i === 2 ? false : f)),
      });
    }
  }

  modifyWithClippingMagicTool(evt, idx) {
    evt.stopPropagation();
    const { images, imageBaseNames, imageCMInfos, originLinks } = this.state;
    const config = {
      headers: {
        "content-type": "multipart/form-data",
      },
    };

    if (imageCMInfos[idx].id) {
      this.showClippingMagicEditingTool(idx);
      return;
    }

    if (!imageBaseNames[idx] && !originLinks[idx]) return;

    const formData = new FormData();

    if (originLinks[idx]) {
      formData.append("link", originLinks[idx]);
    } else {
      formData.append("image", images[idx], imageBaseNames[idx]);
    }
    formData.append("modify", true);

    /* upload image to ClippingMagic backend, and open the editor */

    // show the loading animator
    this.setState({
      bgRemoving: this.state.bgRemoving.map((f, i) => (i === idx ? true : f)),
    });

    // API UPDATE
    axios
      .post(`${this.API_BASE_URL}/clipping/upload`, formData, config)
      .then(({ data }) => {
        if (data.statusCode !== 200) {
          console.log(`${data.error.type} : ${data.error.description}`);
          return;
        }

        this.setState({
          imageCMInfos: this.state.imageCMInfos.map((f, i) =>
            i === idx
              ? {
                  id: data.data.image.id,
                  secret: data.data.image.secret,
                }
              : f
          ),
        });

        this.showClippingMagicEditingTool(idx);
      });
  }

  onDropHandler = async (files, idx) => {
    const fileName = files[0].name;
    const file = await fetch(files[0].preview).then((res) => res.blob());
    this.setState({
      originLinks: this.state.originLinks.map((l, i) => (i === idx ? "" : l)),
    });
    this.onReadUrlHandler(file, fileName, idx);
  };

  onReadUrlHandler = async (file, fileName, idx) => {
    const isLogoImage = idx === 2;

    if (!file) {
      this.setState({
        images: this.state.images.map((f, i) => (i === idx ? null : f)),
        imageBaseNames: this.state.imageBaseNames.map((f, i) =>
          i === idx ? "" : f
        ),
        base64: this.state.base64.map((f, i) => (i === idx ? demoImage : f)),
      });
      return;
    }

    console.log("blob", file);

    this.setState({
      imageFileNames: this.state.imageFileNames.map((p, i) =>
        i === idx ? fileName.split(".").slice(0, -1).join(".") : p
      ),
      imageBaseNames: this.state.imageBaseNames.map((f, i) =>
        i === idx ? fileName : f
      ),
      images: this.state.images.map((f, i) => (i === idx ? file : f)),
      bgRemoved: this.state.bgRemoved.map((f, i) => (i === idx ? false : f)),
    });

    // Before API call, start loading animator
    this.setState({
      bgRemoving: this.state.bgRemoving.map((f, i) => (i === idx ? true : f)),
      bgRemovingBtnText: this.state.bgRemovingBtnText.map((t, i) =>
        i === idx ? (isLogoImage ? "Loading" : "Auto clipping") : t
      ),
      imageCMInfos: this.state.imageCMInfos.map((f, i) =>
        i === idx ? { id: null, secret: null } : f
      ),
      visualPos: this.state.visualPos.map((v, i) =>
        i === idx
          ? {
              visualLeft: 0.5,
              visualTop: 0.5,
            }
          : v
      ),
    });

    try {
      if (isLogoImage) {
        const reader = new FileReader();
        reader.onloadend = () => {
          this.processClippingMagicResultImage(idx, reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        // get base64 of auto clipped image
        const { data } = await this.processAutoClipping(
          file,
          this.state.originLinks[idx],
          fileName
        );
        console.log(data);

        if (data.statusCode !== 200) {
          throw new Error(`${data.error.type} : ${data.error.description}`);
        }

        // download image, get base64, and show image
        this.processClippingMagicResultImage(idx, data.data.base64);
      }
    } catch (err) {
      console.log("Errror on onReadUrlHandler(): ", err);

      this.setState({
        bgRemoving: this.state.bgRemoving.map((f, i) => (i === 2 ? false : f)),
      });
    }

    this.setState({
      bgRemovingBtnText: this.state.bgRemovingBtnText.map((t, i) =>
        i === idx ? (isLogoImage ? "Remove bg" : "Modify") : t
      ),
    });
  };

  getColorsFromBase64(base64) {
    const imageElement = document.createElement("img");
    imageElement.src = base64;

    Vibrant.from(imageElement)
      .getPalette()
      .then((palette) => {
        const {
          sport,
          isAuto,
          originTintColorValue,
          tintColorValue,
        } = this.state;
        console.log("palette", palette);
        const tintVibrantHex =
          sport === "gymnastics"
            ? palette.Vibrant.hex
            : palette.DarkVibrant.hex;

        const colorSettings = {
          palette: {
            Vibrant: palette.Vibrant.hex,
            LightVibrant: palette.LightVibrant.hex,
            DarkVibrant: palette.DarkVibrant.hex,
            Muted: palette.Muted.hex,
            LightMuted: palette.LightMuted.hex,
            DarkMuted: palette.DarkMuted.hex,
          },
          playerNumStroke: palette.Vibrant.hex,
          firstNameColor: palette.Vibrant.hex,
          secondNameColor: palette.DarkVibrant.hex,
          thirdNameColor: palette.DarkVibrant.hex,
          headerCopyColor: palette.DarkVibrant.hex,
          footerCopyColor: palette.Vibrant.hex,
        };

        // TODO: tintColor is ultimate override

        if (isAuto) {
          colorSettings.tintColorValue =
            originTintColorValue === "#000000" ||
            !!originTintColorValue === false
              ? tintVibrantHex
              : tintColorValue;
        } else {
          colorSettings.tintColorValue = tintVibrantHex;
        }

        const baseballSports = ["baseball", "softball", "football", "lacross"];

        if (baseballSports.indexOf(sport) > -1) {
          colorSettings.firstNameColor = colorSettings.tintColorValue;
          colorSettings.secondNameColor = colorSettings.tintColorValue;
          colorSettings.footerNameColor = colorSettings.tintColorValue;
          colorSettings.playerNumStroke = colorSettings.tintColorValue;
        }

        this.setState(colorSettings);
      })
      .catch((err) => {
        console.log("Virbrant.js, error :", err);
      });
  }

  processClippingMagicResultImage(idx, base64) {
    const img = new Image();
    const comp = this;

    img.crossOrigin = "Anonymous";
    img.src = base64.startsWith("data:image")
      ? base64
      : `data:image/png;base64,${base64}`;

    img.onload = function () {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d").drawImage(this, 0, 0, img.width, img.height);

      // Returns a copy of a canvas element with surrounding transparent space removed, and then get base64 data
      comp.processBase64(trimCanvas(canvas).toDataURL("image/png"), idx);

      // After auto-clipping result, stop the loading animator
      comp.setState({
        bgRemoving: comp.state.bgRemoving.map((f, i) =>
          i === idx ? false : f
        ),
      });
    };
  }

  async base64ToRawPng(idx) {
    const base64 = this.state.base64[idx];
    return await fetch(base64).then((res) => res.blob());
  }

  getImageTypeFromBase64(idx) {
    const base64 = this.state.base64[idx];
    const type = base64.match(/^data:image\/(.*?);base64/);
    return type ? "." + type[1] : ".png";
  }

  onSubmitHandler = async () => {
    const formData = new FormData();
    const { sport, isAuto, playerId } = this.state;

    for (let p of this.serializableStateKeys) {
      formData.append(p, this.state[p]);
    }

    formData.append("visualPos", JSON.stringify(this.state.visualPos));
    formData.append("rotateAngle", JSON.stringify([0, 0, 0]));
    formData.append("elementsPos", JSON.stringify(this.state.elementsPos));

    // replace file extension
    formData.append(
      "images[]",
      await this.base64ToRawPng(0),
      this.state.imageFileNames[0].length > 0
        ? this.state.imageFileNames[0] + this.getImageTypeFromBase64(0)
        : ""
    );
    formData.append(
      "images[]",
      await this.base64ToRawPng(1),
      this.state.imageFileNames[1].length > 0
        ? this.state.imageFileNames[1] + this.getImageTypeFromBase64(1)
        : ""
    );
    formData.append(
      "images[]",
      await this.base64ToRawPng(2),
      this.state.imageFileNames[2].length > 0
        ? this.state.imageFileNames[2] + this.getImageTypeFromBase64(2)
        : ""
    );

    // automate
    if (isAuto) {
      const settings = {};
      const serializableStateKeys = [
        "playerId",
        "sport",
        ...this.serializableStateKeys,
        "palette",
        "visualPos",
        "elementsPos",
        "imageFileNames",
        "bgRemoved",
        "bgRemovingBtnText",
        "imageBaseNames",
        "imageCMInfos",
        "playerImageScaleMode",
        "originLinks",
        "originTintColorValue",
        // "productUniqueId",
        // "productAccepting"
      ];

      for (let p of serializableStateKeys) {
        settings[p] = this.state[p];
      }
      formData.append("isAutoMode", isAuto);
      formData.append("playerId", playerId);
      formData.append("settings", JSON.stringify(settings));
    }

    formData.append("Submit", true);

    const config = {
      headers: {
        "content-type": "multipart/form-data",
        accept: "image/png",
      },
    };

    /* calculate steps for progressing ; split a second into 10 parts */

    const estimatedTime = this.state.estimatedTime * 10; // count of 100ms
    const step = 1.0 / estimatedTime;
    let points = Array(estimatedTime);

    for (let idx = 0; idx < estimatedTime; idx++)
      points[idx] = (100 * easeQuad(idx * step)).toFixed(0);

    points = ["0", ...points.filter((p) => p > 0), "100"];

    this.setState({
      productLoading: true,
      percentPoints: points,
      producedImage: null,
    });

    // API UPDATE
    axios
      .post(
        `${this.API_BASE_URL}/product/individual/${sport}`,
        formData,
        config
      )
      .then(async ({ data }) => {
        if (data.statusCode !== 200) {
          throw new Error(`${data.error.type} : ${data.error.description}`);
        }

        const timeElapsed = data.data.time_elapsed;
        const base64 =
          "data:image/png;base64," +
          (timeElapsed ? data.data.base64 : data.data);
        const sleep = (time) =>
          new Promise((resolve) => setTimeout(resolve, time));

        this.setState({
          producedImage: base64,
          percentPoints: [98, 98, 98, 98, 99, 99, 99, 100],
        });

        await sleep(900);

        this.setState({ productLoading: false });

        this.wrapAcceptedFormData();

        if (isAuto) {
          const { poster } = data.data;
          this.setState({
            productUniqueId: poster.unique_id,
            productAccepting: false,
          });
          console.log("isAuto mode", poster);
        }
      })
      .catch((err) => {
        console.log("Error on onSubmitHandler()", err);

        this.setState({
          productLoading: false,
        });
      });
  };

  async wrapAcceptedFormData() {
    // wrap accepted form data
    const acceptedData = {};
    const serializableStateKeys = [
      "sport",
      ...this.serializableStateKeys,
      "palette",
      "visualPos",
      "elementsPos",
      "imageFileNames",
      "bgRemoved",
      "bgRemovingBtnText",
      "imageBaseNames",
      "imageCMInfos",
      "playerImageScaleMode",
      "productUniqueId",
      "productAccepting",
      "originLinks",
    ];

    for (let p of serializableStateKeys) {
      acceptedData[p] = this.state[p];
    }

    for (let i of [0, 1, 2])
      acceptedData[`image${i}`] =
        this.state.base64[i] === demoImage ? "" : this.state.base64[i];

    const rawImageFormData = new FormData();
    for (let i of [0, 1, 2]) {
      rawImageFormData.append(
        "rawImage[]",
        this.state.images[i]
          ? this.state.images[i]
          : new Blob([demoImage], { type: "image/png" }),
        this.state.imageBaseNames[i]
      );
    }

    acceptedData["rawImages"] = rawImageFormData;

    this.setState({
      acceptedFormData: acceptedData,
    });
  }

  processBase64(base64, idx) {
    visualCenter(base64, (err, result) => {
      const { visualTop, visualLeft, bgColor } = result;

      console.log("visualCenter", bgColor);

      if (idx === 2 || (idx === 1 && !this.state.images[2])) {
        this.getColorsFromBase64(base64);
      }

      this.setState({
        visualPos: this.state.visualPos.map((v, i) =>
          i === idx ? { visualLeft: visualLeft, visualTop: 0.5 } : v
        ),
        base64: this.state.base64.map((b, i) => (i === idx ? base64 : b)),
      });
    });
  }

  // clear image on the upload area
  clearImage(evt, idx) {
    evt.stopPropagation();
    this.setState({
      base64: this.state.base64.map((b, i) => (i === idx ? demoImage : b)),
      file: this.state.images.map((b, i) => (i === idx ? null : b)),
      imageFileNames: this.state.imageFileNames.map((b, i) =>
        i === idx ? "" : b
      ),
    });
  }

  moveVisualVertPos(evt, idx, dir = 1) {
    const step = dir * 0.02;
    evt.stopPropagation();

    this.setState({
      visualPos: this.state.visualPos.map((v, i) =>
        i === idx
          ? { visualLeft: v.visualLeft, visualTop: v.visualTop + step }
          : v
      ),
    });
  }

  moveVisualHorizPos(evt, idx, dir = 1) {
    const step = dir * 0.02;
    evt.stopPropagation();

    this.setState({
      visualPos: this.state.visualPos.map((v, i) =>
        i === idx
          ? { visualLeft: v.visualLeft + step, visualTop: v.visualTop }
          : v
      ),
    });
  }

  moveElementVert(name, dir = 1) {
    const step = dir * 0.1;
    let { elementsPos } = this.state;
    if (Array.isArray(elementsPos)) {
      elementsPos = {};
    }

    elementsPos[name] = elementsPos[name] ? elementsPos[name] + step : step;
    this.setState({
      elementsPos,
    });
  }

  // copy code to clipboard
  copyProductUniqueIdToClipboard() {
    const textArea = document.createElement("textarea");
    textArea.value = this.state.productUniqueId;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("Copy");
    textArea.remove();
    this.setState({ copyTooltipText: "Copied" });
  }

  render() {
    const {
      base64,
      backgroundMode,
      visualPos,
      headerCopy,
      footerCopy,
      playerNum,
      playerNumStroke,
      tintColor,
      tintColorMode,
      tintColorValue,
      sport,
      firstName,
      firstNameColor,
      firstNameSize,
      firstNameFamily,
      secondName,
      secondNameColor,
      secondNameSize,
      secondNameFamily,
      thirdName,
      thirdNameColor,
      thirdNameSize,
      thirdNameFamily,
      producedImage,
      productLoading,
      firstNameMaxSize,
      secondNameMaxSize,
      thirdNameMaxSize,
      bgRemoving,
      bgRemoved,
      palette,
      percentPoints,
      playerImageScaleMode,
      playerImageWidth,
      copyTooltipText,

      productUniqueId,
      productAccepting,
      acceptedFormData,
      footerCopyColor,
      headerCopyColor,
    } = this.state;

    return (
      <div className="app">
        <div className="header">
          <div class="CmApp-Bar-container CmApp-Bar-top_bar noselect">
            <div class="CmApp-Bar-bar_container">
              <div
                class="mark-tools CmApp-Bar-tool_group"
                data-toggle="buttons"
              >
                <div class="CmApp-Tools-mark_tools">
                  <label
                    title="Keep Tool (Keyboard: Toggle Spacebar)"
                    class="tool-radio-button green-tool CmApp-Tools-tool CmApp-Tools-tool_radio_button"
                    id="green-tool"
                  >
                    <input
                      type="radio"
                      value="app-radio-tool-green-tool"
                      name="app-radio-tool"
                    />
                    <span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                      >
                        <circle
                          class="tool-dark"
                          cx="9.88"
                          cy="10"
                          r="10"
                        ></circle>
                        <path
                          class="tool-light"
                          d="M9.88,1a9,9,0,1,0,9,9,9,9,0,0,0-9-9Z"
                        ></path>
                        <polygon
                          class="tool-white"
                          points="15 9 11 9 11 5 9 5 9 9 5 9 5 11 9 11 9 15 11 15 11 11 15 11 15 9"
                        ></polygon>
                      </svg>
                    </span>
                  </label>

                  <label
                    title="Remove Tool (Keyboard: Toggle Spacebar)"
                    class="tool-radio-button red-tool CmApp-Tools-tool CmApp-Tools-tool_radio_button"
                    id="red-tool"
                  >
                    <input
                      type="radio"
                      value="app-radio-tool-red-tool"
                      name="app-radio-tool"
                    />
                    <span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                      >
                        <path
                          class="tool-dark"
                          d="M10,0A10,10,0,1,0,20,10,10,10,0,0,0,10,0Z"
                        ></path>
                        <circle
                          class="tool-light"
                          cx="10"
                          cy="10"
                          r="9"
                        ></circle>
                        <rect
                          class="tool-white"
                          x="5"
                          y="9"
                          width="10"
                          height="2"
                        ></rect>
                      </svg>
                    </span>
                  </label>

                  <label
                    title="Hair Tool (Keyboard: V)"
                    class="CmApp-Cat-onlyIsPhotoMode tool-radio-button hair-tool CmApp-Tools-tool CmApp-Tools-tool_radio_button"
                    id="hair-tool"
                  >
                    <input
                      type="radio"
                      value="app-radio-tool-hair-tool"
                      name="app-radio-tool"
                    />
                    <span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                      >
                        <path
                          class="tool-dark"
                          d="M10,0A10,10,0,1,0,20,10,10,10,0,0,0,10,0Z"
                        ></path>
                        <circle
                          class="tool-light"
                          cx="10"
                          cy="10"
                          r="9"
                        ></circle>
                        <path
                          class="tool-black"
                          d="m 11.711864,4.440678 h 2 L 8.2881357,15.559322 H 6.2881356 Z"
                        ></path>
                      </svg>
                    </span>
                  </label>

                  <label
                    title="Eraser (Keyboard: X)"
                    class="tool-radio-button erase-tool CmApp-Tools-tool CmApp-Tools-tool_radio_button"
                    id="erase-tool"
                  >
                    <input
                      type="radio"
                      value="app-radio-tool-erase-tool"
                      name="app-radio-tool"
                    />
                    <span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                      >
                        <path
                          class="tool-dark"
                          d="M18.93,7.34,12.54.94a.53.53,0,0,0-.71,0l-8.9,8.9a.51.51,0,0,0,0,.71l.34.34L1,13.14a.47.47,0,0,0-.15.35.49.49,0,0,0,.15.36l5,5a.51.51,0,0,0,.7,0L9,16.63l.3.31a.53.53,0,0,0,.36.15.51.51,0,0,0,.35-.15L18.93,8A.5.5,0,0,0,18.93,7.34ZM9.68,15.88,4,10.2,12.18,2l5.69,5.69Z"
                        ></path>
                        <rect
                          class="tool-light"
                          x="5.14"
                          y="4.92"
                          width="11.58"
                          height="8.04"
                          transform="translate(-3.12 10.35) rotate(-45)"
                        ></rect>
                        <rect
                          class="tool-white"
                          x="3.85"
                          y="11.65"
                          width="2.69"
                          height="6.13"
                          transform="translate(-8.88 7.98) rotate(-45)"
                        ></rect>
                      </svg>
                    </span>
                  </label>

                  <label
                    title="Scalpel (Keyboard: S)"
                    class="tool-radio-button sword-tool CmApp-Tools-tool CmApp-Tools-tool_radio_button"
                    id="sword-tool"
                  >
                    <input
                      type="radio"
                      value="app-radio-tool-sword-tool"
                      name="app-radio-tool"
                    />
                    <span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                      >
                        <path
                          class="tool-dark"
                          d="M17.87,16.16l-8-8h0l-7-7A.5.5,0,0,0,2,1.54l1,12a.5.5,0,0,0,.24.39A.59.59,0,0,0,3.5,14a.43.43,0,0,0,.19,0l4.69-1.87,6.77,6.76a.47.47,0,0,0,.35.15.52.52,0,0,0,.35-.14l2-2a.51.51,0,0,0,.15-.35A.55.55,0,0,0,17.87,16.16Z"
                        ></path>
                        <path
                          class="tool-white"
                          d="M3.11,2.82l5.3,5.29a1.22,1.22,0,0,0-.07.17,4.29,4.29,0,0,0-.56,3L3.94,12.78Z"
                        ></path>
                        <path
                          class="tool-light"
                          d="M15.5,17.8,8.85,11.15c-.44-.45,0-1.47.32-2.28l7.64,7.64Z"
                        ></path>
                      </svg>
                    </span>
                  </label>

                  <label
                    title="Pan Tool (Keyboard: Shift or C)"
                    class="tool-radio-button pan-tool CmApp-Tools-tool CmApp-Tools-tool_radio_button active"
                    id="pan-tool"
                  >
                    <input
                      type="radio"
                      value="app-radio-tool-pan-tool"
                      name="app-radio-tool"
                    />
                    <span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                      >
                        <path
                          class="tool-dark"
                          d="M9.49,18.18H8.25l-.83,0a.5.5,0,0,1-.49-.59,1.49,1.49,0,0,0-.06-.94c-.18-.15-.43-.38-.66-.61l-.54-.5-.91-1a7.75,7.75,0,0,1-.54-.84c-.21-.36-.47-.79-.8-1.28a6.14,6.14,0,0,0-.55-.65,5.34,5.34,0,0,1-.81-1,2.31,2.31,0,0,1-.23-1.79A1.76,1.76,0,0,1,3.77,7.72a2.57,2.57,0,0,1,1.56.68l.08.07c-.07-.19-.13-.35-.2-.51S5.08,7.64,5,7.48a7.57,7.57,0,0,0-.3-.74l-.21-.46A13.23,13.23,0,0,1,4,4.7,2,2,0,0,1,4.35,3a2,2,0,0,1,2-.54,2.58,2.58,0,0,1,1.21,1A4.78,4.78,0,0,1,8,4.38c0-.15,0-.31,0-.47s.07-.67.09-.82a1.74,1.74,0,0,1,1-1.39,2.29,2.29,0,0,1,1.87,0,1.67,1.67,0,0,1,1,1.39,2.12,2.12,0,0,1,.62-.44,1.9,1.9,0,0,1,2,.37,2.42,2.42,0,0,1,.64,1.5c0,.29,0,.62,0,.93,0,.13,0,.26,0,.37l0,0,.11-.18a2,2,0,0,1,.91-.77,1.46,1.46,0,0,1,1.14,0,1.67,1.67,0,0,1,.89.9,2.75,2.75,0,0,1,0,1.16l0,.22a9.22,9.22,0,0,1-.37,1.77c-.1.35-.22.91-.35,1.66l-.06.29c-.08.5-.22,1.26-.33,1.65A6.55,6.55,0,0,1,16.45,14a6.94,6.94,0,0,0-1.16,1.7,2.46,2.46,0,0,0-.08.65,2.18,2.18,0,0,0,0,.28,3.2,3.2,0,0,0,.1.8.49.49,0,0,1-.06.41.51.51,0,0,1-.35.22,6,6,0,0,1-1.43,0c-.62-.09-1.15-.93-1.35-1.27-.24.46-.79,1.22-1.36,1.29A11,11,0,0,1,9.49,18.18ZM8,17.16h.3c.91,0,1.86,0,2.36,0a3.49,3.49,0,0,0,.73-.92.89.89,0,0,1,1.58.05,2.56,2.56,0,0,0,.69.86,3.67,3.67,0,0,0,.59,0,3.37,3.37,0,0,1,0-.55v-.24a3.55,3.55,0,0,1,.1-.83,7.1,7.1,0,0,1,1.35-2.11,5.6,5.6,0,0,0,.58-1.26c.1-.34.23-1.09.31-1.54l.05-.3c.14-.79.27-1.36.37-1.72A9.54,9.54,0,0,0,17.32,7l0-.23a4.74,4.74,0,0,0,0-.7A.65.65,0,0,0,17,5.71a.43.43,0,0,0-.35,0,.93.93,0,0,0-.47.39l-.12.19a3.61,3.61,0,0,0-.29.48c-.12.24-.31.73-.36.86s-.17.46-.26.75a.54.54,0,0,1-.58.36c-.45-.08-.43-.54-.42-.71V7.35c0-.48,0-.9,0-1.53,0-.13,0-.29,0-.45a7.3,7.3,0,0,0,0-.81,1.39,1.39,0,0,0-.37-.89A1,1,0,0,0,13,3.52a1.06,1.06,0,0,0-.57.68,18,18,0,0,0-.28,3c0,.41,0,.76-.05.95a.5.5,0,0,1-.52.47c-.33,0-.44-.09-.48-.56h0v0c0-.23,0-.54,0-1V6.33c0-.49,0-1.09,0-2,0-.13-.08-1-.1-1.08-.06-.47-.26-.6-.41-.66a1.28,1.28,0,0,0-1.05,0,.74.74,0,0,0-.42.65c0,.12-.08.55-.08.67C9,5.11,9,6,9.05,7l0,1.21a.5.5,0,0,1-.45.51.51.51,0,0,1-.54-.4L8,7.81A10.88,10.88,0,0,0,7.4,5.58a7.42,7.42,0,0,0-.7-1.53A1.64,1.64,0,0,0,6,3.44a1,1,0,0,0-.84.19A1,1,0,0,0,5,4.47a10.36,10.36,0,0,0,.45,1.42l.19.44A8.14,8.14,0,0,1,6,7.15a3,3,0,0,0,.16.42,7.15,7.15,0,0,1,.33.89c.16.52.26.92.34,1.25l.09.38h0c0,.18.15.59-.24.78s-.64-.16-.75-.32l-.29-.4a3.07,3.07,0,0,0-.2-.27,9.78,9.78,0,0,0-.72-.72,1.65,1.65,0,0,0-1-.44.76.76,0,0,0-.9.54,1.4,1.4,0,0,0,.17,1,4.42,4.42,0,0,0,.67.83,9,9,0,0,1,.64.77c.34.5.61,1,.83,1.33a7.32,7.32,0,0,0,.44.71l.85.93c.11.1.32.29.52.49l.62.57A1.68,1.68,0,0,1,8,17.16Z"
                        ></path>
                        <path
                          class="tool-light"
                          d="M8,17.16h.3c.91,0,1.86,0,2.36,0a3.49,3.49,0,0,0,.73-.92.89.89,0,0,1,1.58.05,2.56,2.56,0,0,0,.69.86,3.67,3.67,0,0,0,.59,0,3.37,3.37,0,0,1,0-.55v-.24a3.55,3.55,0,0,1,.1-.83,7.1,7.1,0,0,1,1.35-2.11,5.6,5.6,0,0,0,.58-1.26c.1-.34.23-1.09.31-1.54l.05-.3c.14-.79.27-1.36.37-1.72A9.54,9.54,0,0,0,17.32,7l0-.23a4.74,4.74,0,0,0,0-.7A.65.65,0,0,0,17,5.71a.43.43,0,0,0-.35,0,.93.93,0,0,0-.47.39l-.12.19a3.61,3.61,0,0,0-.29.48c-.12.24-.31.73-.36.86s-.17.46-.26.75a.54.54,0,0,1-.58.36c-.45-.08-.43-.54-.42-.71V7.35c0-.48,0-.9,0-1.53,0-.13,0-.29,0-.45a7.3,7.3,0,0,0,0-.81,1.39,1.39,0,0,0-.37-.89A1,1,0,0,0,13,3.52a1.06,1.06,0,0,0-.57.68,18,18,0,0,0-.28,3c0,.41,0,.76-.05.95a.5.5,0,0,1-.52.47c-.33,0-.44-.09-.48-.56h0v0c0-.23,0-.54,0-1V6.33c0-.49,0-1.09,0-2,0-.13-.08-1-.1-1.08-.06-.47-.26-.6-.41-.66a1.28,1.28,0,0,0-1.05,0,.74.74,0,0,0-.42.65c0,.12-.08.55-.08.67C9,5.11,9,6,9.05,7l0,1.21a.5.5,0,0,1-.45.51.51.51,0,0,1-.54-.4L8,7.81A10.88,10.88,0,0,0,7.4,5.58a7.42,7.42,0,0,0-.7-1.53A1.64,1.64,0,0,0,6,3.44a1,1,0,0,0-.84.19A1,1,0,0,0,5,4.47a10.36,10.36,0,0,0,.45,1.42l.19.44A8.14,8.14,0,0,1,6,7.15a3,3,0,0,0,.16.42,7.15,7.15,0,0,1,.33.89c.16.52.26.92.34,1.25l.09.38h0c0,.18.15.59-.24.78s-.64-.16-.75-.32l-.29-.4a3.07,3.07,0,0,0-.2-.27,9.78,9.78,0,0,0-.72-.72,1.65,1.65,0,0,0-1-.44.76.76,0,0,0-.9.54,1.4,1.4,0,0,0,.17,1,4.42,4.42,0,0,0,.67.83,9,9,0,0,1,.64.77c.34.5.61,1,.83,1.33a7.32,7.32,0,0,0,.44.71l.85.93c.11.1.32.29.52.49l.62.57A1.68,1.68,0,0,1,8,17.16Z"
                        ></path>
                        <rect
                          class="tool-dark"
                          x="12.88"
                          y="11"
                          width="1"
                          height="4"
                        ></rect>
                        <rect
                          class="tool-dark"
                          x="10.88"
                          y="11"
                          width="1"
                          height="4"
                          transform="translate(-0.05 0.05) rotate(-0.24)"
                        ></rect>
                        <rect
                          class="tool-dark"
                          x="8.9"
                          y="11"
                          width="1"
                          height="4"
                          transform="translate(-0.07 0.05) rotate(-0.31)"
                        ></rect>
                      </svg>
                    </span>
                  </label>
                </div>
              </div>
              <div class="CmApp-Bar-tool_group CmApp-Bar-tool_group_blue">
                <div class="dropdown">
                  <button
                    aria-expanded="false"
                    type="button"
                    aria-haspopup="true"
                    class="CmApp-Tools-editMenu app_bttn app_bttn_white dropdown-toggle"
                    data-toggle="dropdown"
                  >
                    <span class="hidden-xs">Edit</span>
                    <span class="CmApp-Tools-verticalEllipsis">⋮</span>
                    {/* <i class="Icons-down_carrot" 
                    style="margin-left: 5px;
                    "></i> */}
                  </button>
                  <ul class="dropdown-menu modern_menu">
                    <li class="disabled CmApp-Tools-undoMenuItem">
                      <a class="CmApp-Tools-undo" disabled="disabled">
                        <span class="yo-data-uri undo-icon-svg"></span>
                        <span>Undo</span>
                      </a>
                    </li>

                    <li class="disabled CmApp-Tools-redoMenuItem">
                      <a class="CmApp-Tools-redo" disabled="disabled">
                        <span class="yo-data-uri redo-icon-svg"></span>
                        <span>Redo</span>
                      </a>
                    </li>
                    <li role="separator" class="divider"></li>
                    <li
                      class="disabled"
                      title="Please log in to copy/paste masks. "
                      alt="Please log in to copy/paste masks. "
                    >
                      <a class="CmApp-Tools-copy_mask_tool">
                        <span class="yo-data-uri copy-icon-svg"></span>
                        <span>Copy Marks</span>
                      </a>
                    </li>

                    <li
                      class="disabled"
                      title="Please log in to copy/paste masks. "
                      alt="Please log in to copy/paste masks. "
                    >
                      <a class="CmApp-Tools-paste_mask_tool">
                        <span class="yo-data-uri paste-icon-svg"></span>
                        <span>Paste Marks</span>
                      </a>
                    </li>

                    <li class="">
                      <a class="CmApp-Tools-clear_user_mask_tool">
                        <span class="yo-data-uri clear-mask-icon-svg"></span>
                        <span>Clear Marks</span>
                      </a>
                    </li>
                    <li role="separator" class="divider"></li>
                    <li class="">
                      <a class="CmApp-Tools-clear_all_edits">
                        <span class="yo-data-uri revert-icon-svg"></span>
                        <span>Clear All</span>
                      </a>
                    </li>
                  </ul>
                </div>

                <button
                  title="Undo (Keyboard: Z)"
                  class="hidden-xs CmApp-Tools-tool CmApp-Tools-undo "
                  alt="Undo (Keyboard: Z)"
                  id="CmApp-Tools-undo"
                  disabled="disabled"
                >
                  <span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path
                        class="tool-dark"
                        d="M11.13,5H4.59L6.74,2.85,6,2.15l-3,3a.5.5,0,0,0,0,.7l3,3,.71-.7L4.59,6h6.54A4.84,4.84,0,0,1,16,10.84v.32A4.84,4.84,0,0,1,11.13,16H3.88v1h7.25A5.85,5.85,0,0,0,17,11.16v-.32A5.85,5.85,0,0,0,11.13,5Z"
                      ></path>
                    </svg>
                  </span>
                </button>

                <button
                  title="Redo (Keyboard: Y)"
                  class="hidden-xs CmApp-Tools-tool CmApp-Tools-redo "
                  alt="Redo (Keyboard: Y)"
                  id="CmApp-Tools-redo"
                  disabled="disabled"
                >
                  <span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path
                        class="tool-dark"
                        d="M13.94,8.85l3-3a.5.5,0,0,0,0-.7l-3-3-.71.7L15.38,5H8.84A5.85,5.85,0,0,0,3,10.84v.32A5.85,5.85,0,0,0,8.84,17h7.25V16H8.84A4.84,4.84,0,0,1,4,11.16v-.32A4.84,4.84,0,0,1,8.84,6h6.54L13.23,8.15Z"
                      ></path>
                    </svg>
                  </span>
                </button>
              </div>
              <div class="CmApp-Bar-tool_group CmApp-Bar-tool_group_blue">
                <button
                  title="Zoom In (Mouse Wheel)"
                  class="CmApp-Tools-tool CmApp-Tools-zoom_in "
                  alt="Zoom In (Mouse Wheel)"
                  id="CmApp-Tools-zoom_in"
                >
                  <span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path
                        class="tool-dark"
                        d="M18.74,17.55l-4.17-4.17a7.56,7.56,0,1,0-.7.71L18,18.26Z"
                      ></path>
                      <path
                        class="tool-light"
                        d="M8.88,2a6.5,6.5,0,1,1-6.5,6.5A6.51,6.51,0,0,1,8.88,2"
                      ></path>
                      <polygon
                        class="tool-dark"
                        points="11.88 8 9.38 8 9.38 5.5 8.38 5.5 8.38 8 5.88 8 5.88 9 8.38 9 8.38 11.5 9.38 11.5 9.38 9 11.88 9 11.88 8"
                      ></polygon>
                    </svg>
                  </span>
                </button>

                <button
                  title="Zoom Out (Mouse Wheel)"
                  class="CmApp-Tools-tool CmApp-Tools-zoom_out "
                  alt="Zoom Out (Mouse Wheel)"
                  id="CmApp-Tools-zoom_out"
                >
                  <span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path
                        class="tool-dark"
                        d="M18.35,17.55l-4.16-4.17A7.5,7.5,0,1,0,8.5,16a7.4,7.4,0,0,0,5-1.91l4.17,4.17Z"
                      ></path>
                      <path
                        class="tool-light"
                        d="M8.5,2A6.5,6.5,0,1,1,2,8.5,6.51,6.51,0,0,1,8.5,2"
                      ></path>
                      <rect
                        class="tool-dark"
                        x="5.5"
                        y="8"
                        width="6"
                        height="1"
                      ></rect>
                    </svg>
                  </span>
                </button>

                <button
                  title="Zoom to Fit (Keyboard: Home)"
                  class="CmApp-Tools-tool CmApp-Tools-zoom_to_fit "
                  alt="Zoom to Fit (Keyboard: Home)"
                  id="CmApp-Tools-zoom_to_fit"
                >
                  <span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 20">
                      <path
                        class="tool-dark"
                        d="M1.88,2.37c0-.2.23-.37.49-.37H8.88V1H2.37A1.44,1.44,0,0,0,.88,2.37V8h1Z"
                      ></path>
                      <path
                        class="tool-dark"
                        d="M22.4,1H15.88V2H22.4a.44.44,0,0,1,.48.37V8h1V2.37A1.43,1.43,0,0,0,22.4,1Z"
                      ></path>
                      <path
                        class="tool-dark"
                        d="M22.88,17.63a.44.44,0,0,1-.48.37H15.88v1H22.4a1.43,1.43,0,0,0,1.48-1.37V12h-1Z"
                      ></path>
                      <path
                        class="tool-dark"
                        d="M11.76,10H2A1.07,1.07,0,0,0,.88,11v7A1.07,1.07,0,0,0,2,19h9.75a1.06,1.06,0,0,0,1.12-1V11A1.06,1.06,0,0,0,11.76,10Zm0,8H2c-.07,0-.12,0-.13,0V11A.22.22,0,0,1,2,11h9.75c.07,0,.12,0,.12,0l0,7A.22.22,0,0,1,11.76,18Z"
                      ></path>
                      <path
                        class="tool-dark"
                        d="M14,6.85l.71-.7-2-2a.5.5,0,0,0-.71,0l-2,2,.71.7,1.14-1.14V9h1V5.71Z"
                      ></path>
                      <path
                        class="tool-dark"
                        d="M16,12.15l.71.7,2-2a.5.5,0,0,0,0-.7l-2-2-.71.7L17.18,10h-3.3v1h3.3Z"
                      ></path>
                      <path
                        class="tool-light"
                        d="M2,11a.22.22,0,0,0-.14,0v7s.06,0,.13,0h9.75a.22.22,0,0,0,.14,0l0-7s-.05,0-.12,0Z"
                      ></path>
                    </svg>
                  </span>
                </button>
              </div>
              <div class="CmApp-Bar-tool_group hidden-xs">
                <div class="ViewPanes-group hidden-xs" data-toggle="buttons">
                  <label
                    title="Single Pane View (Keyboard: 1)"
                    class="ViewPanes-marks CmApp-Tools-tool CmApp-Tools-tool_radio_button"
                  >
                    <input
                      type="radio"
                      value="ViewPanes-marks"
                      name="ViewPanes-group"
                      autocomplete="off"
                    />
                    <span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 25 20"
                      >
                        <path
                          class="tool-dark"
                          d="M22.38,19h-20a1.5,1.5,0,0,1-1.5-1.5V2.5A1.5,1.5,0,0,1,2.38,1h20a1.5,1.5,0,0,1,1.5,1.5v15A1.5,1.5,0,0,1,22.38,19Z"
                        ></path>
                        <rect
                          class="tool-light"
                          x="1.88"
                          y="2"
                          width="21"
                          height="16"
                          rx="0.5"
                          ry="0.5"
                        ></rect>
                        <path
                          class="tool-dark"
                          d="M16,13H9.93a.5.5,0,0,1-.43-.75l3-5.24a.52.52,0,0,1,.87,0l3,5.24a.55.55,0,0,1,0,.5A.52.52,0,0,1,16,13Z"
                        ></path>
                        <polygon
                          class="tool-white"
                          points="10.79 12 15.12 12 12.96 8.26 10.79 12"
                        ></polygon>
                      </svg>
                    </span>
                  </label>
                  <label
                    title="Split View (Keyboard: 2)"
                    class="ViewPanes-both CmApp-Tools-tool CmApp-Tools-tool_radio_button active"
                  >
                    <input
                      type="radio"
                      checked="true"
                      value="ViewPanes-both"
                      name="ViewPanes-group"
                      autocomplete="off"
                    />
                    <span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 25 20"
                      >
                        <path
                          class="tool-dark"
                          d="M22.38,1h-20A1.5,1.5,0,0,0,.88,2.5v15A1.5,1.5,0,0,0,2.38,19h20a1.5,1.5,0,0,0,1.5-1.5V2.5A1.5,1.5,0,0,0,22.38,1Z"
                        ></path>
                        <path
                          class="tool-light"
                          d="M2.38,18a.5.5,0,0,1-.5-.5V2.5a.5.5,0,0,1,.5-.5h9.5V18Z"
                        ></path>
                        <path
                          class="tool-light"
                          d="M22.88,17.5a.5.5,0,0,1-.5.5h-9.5V2h9.5a.5.5,0,0,1,.5.5Z"
                        ></path>
                        <path
                          class="tool-dark"
                          d="M10,13H3.93a.5.5,0,0,1-.43-.75L6.52,7a.52.52,0,0,1,.87,0l3,5.24a.55.55,0,0,1,0,.5A.52.52,0,0,1,10,13Z"
                        ></path>
                        <path
                          class="tool-dark"
                          d="M21,13H14.93a.5.5,0,0,1-.43-.75l3-5.24a.52.52,0,0,1,.87,0l3,5.24a.55.55,0,0,1,0,.5A.52.52,0,0,1,21,13Z"
                        ></path>
                        <polygon
                          class="tool-white"
                          points="4.79 12 9.12 12 6.96 8.26 4.79 12"
                        ></polygon>
                        <polygon
                          class="tool-white"
                          points="15.79 12 20.12 12 17.95 8.26 15.79 12"
                        ></polygon>
                      </svg>
                    </span>
                  </label>
                </div>
              </div>
              <div class="CmApp-Bar-tool_group">
                <button
                  title="Save Edits"
                  class="hidden-xs CmApp-Tools-tool CmApp-Tools-save  disabled"
                  alt="Save Edits"
                  id="CmApp-Tools-save"
                >
                  <span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path
                        class="tool-dark"
                        d="M17.85,5.15l-4-4A.36.36,0,0,0,13.69,1a.41.41,0,0,0-.19,0H2.5a.5.5,0,0,0-.5.5v17a.5.5,0,0,0,.5.5h15a.5.5,0,0,0,.5-.5V5.5A.47.47,0,0,0,17.85,5.15Z"
                      ></path>
                      <rect
                        class="tool-white"
                        x="6"
                        y="2"
                        width="7"
                        height="4"
                      ></rect>
                      <path
                        class="tool-light"
                        d="M17,18H3V2H5V6.5a.5.5,0,0,0,.5.5h8a.5.5,0,0,0,.5-.5V2.71l3,3Z"
                      ></path>
                      <path
                        class="tool-dark"
                        d="M7.5,3a.5.5,0,0,0-.5.5v1a.5.5,0,0,0,1,0v-1A.5.5,0,0,0,7.5,3Z"
                      ></path>

                      <g class="save-face">
                        <path
                          class="tool-dark"
                          d="M7.5,11.25a.5.5,0,0,1-.5-.5V9.25a.5.5,0,0,1,1,0v1.5A.5.5,0,0,1,7.5,11.25Z"
                        ></path>
                        <path
                          class="tool-dark"
                          d="M9.5,17A3.6,3.6,0,0,1,6,13.5a.5.5,0,0,1,.5-.5h6a.5.5,0,0,1,.5.5A3.6,3.6,0,0,1,9.5,17Z"
                        ></path>
                        <path
                          class="tool-dark"
                          d="M11,11.5A1.5,1.5,0,1,1,12.5,10,1.5,1.5,0,0,1,11,11.5Z"
                        ></path>
                        <path
                          class="tool-light"
                          d="M7.05,14A2.59,2.59,0,0,0,9.5,16,2.59,2.59,0,0,0,12,14Z"
                        ></path>
                        <circle
                          class="tool-white"
                          cx="11"
                          cy="10"
                          r="0.5"
                        ></circle>
                      </g>
                      <path
                        class="tool-dark save-check"
                        d="M8.43,16,5.64,13.16a1,1,0,0,1,0-1.42,1,1,0,0,1,1.41,0l1.38,1.38,4.26-4.25a1,1,0,0,1,1.42,0,1,1,0,0,1,0,1.41Z"
                      ></path>
                    </svg>
                  </span>
                </button>

                <button
                  title="Download Result"
                  class="app_bttn app_bttn_dark CmApp-Tools-download"
                  alt="Download Result"
                  id="CmApp-Tools-download"
                >
                  <span class="hidden_narrow" >
                    <span class="lightState-progress paara" >
                      Uploading...{" "}
                    </span>
                    <span class="lightState-connecting paara" >
                      Connecting...
                    </span>
                    <span class="lightState-updating paara" >
                      Updating...
                    </span>
                    <span class="lightState-updated paara1">
                      Subscribe to Download
                    </span>
                  </span>
                  <span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 6.34 7.99"
                    >
                      <path d="M5.84,8H.5a.5.5,0,0,1-.5-.5A.5.5,0,0,1,.5,7H5.84a.5.5,0,0,1,.5.5A.5.5,0,0,1,5.84,8Z"></path>
                      <path d="M5.53,3.33h0a.36.36,0,0,0-.52,0L3.7,4.63,3.53.37A.38.38,0,0,0,3.15,0h0a.38.38,0,0,0-.38.37L2.66,4.63l-1.3-1.3a.37.37,0,0,0-.53,0h0a.37.37,0,0,0,0,.52L2.78,5.79a.56.56,0,0,0,.81,0L5.53,3.85A.37.37,0,0,0,5.53,3.33Z"></path>
                    </svg>
                  </span>
                </button>

                <button
                  title="Output Options"
                  class="hidden-xs CmApp-Tools-tool PreferencesDialog-openExportOptions "
                  alt="Output Options"
                  id="PreferencesDialog-openExportOptions"
                >
                  <div class="CmApp-Tools-corner_arrow"></div>
                  <span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path
                        class="tool-dark"
                        d="M18.64,9.7,17,9.24,17,9.08a5.73,5.73,0,0,0-.39-1L16.5,8l.81-1.45a.5.5,0,0,0-.08-.6L16.08,4.76a.5.5,0,0,0-.59-.08L14,5.5l-.16-.08a5.68,5.68,0,0,0-1-.42l-.17-.06-.46-1.58A.5.5,0,0,0,11.8,3H10.2a.5.5,0,0,0-.48.36L9.26,4.94,9.09,5,9,5.05a2.48,2.48,0,0,1,.85.65l.06.09a.51.51,0,0,0,.28-.31L10.57,4h.86l.43,1.48a.49.49,0,0,0,.33.34l.42.13a5.43,5.43,0,0,1,.8.35l.4.21a.48.48,0,0,0,.48,0l1.36-.76.6.6L15.5,7.7a.49.49,0,0,0,0,.47l.21.4a5.47,5.47,0,0,1,.32.81l.14.42a.51.51,0,0,0,.34.33l1.5.43v.87l-1.49.43a.5.5,0,0,0-.34.32l-.13.43a6.1,6.1,0,0,1-.34.81l-.21.39a.49.49,0,0,0,0,.47l.75,1.37-.6.6-1.36-.77a.51.51,0,0,0-.48,0l-.39.2a6.23,6.23,0,0,1-.81.36l-.42.13a.49.49,0,0,0-.33.34L11.42,18h-.84l-.44-1.49a.49.49,0,0,0-.33-.34L9.39,16a5.63,5.63,0,0,1-.8-.36l-.4-.2a.51.51,0,0,0-.48,0l-1.36.77-.6-.6.75-1.37a.44.44,0,0,0,0-.28H5.48l0,0-.81,1.46a.5.5,0,0,0,.09.6l1.14,1.13a.49.49,0,0,0,.59.08L8,16.49l.16.08a6.61,6.61,0,0,0,1,.42l.17.05.46,1.6a.5.5,0,0,0,.48.36h1.6a.5.5,0,0,0,.48-.36l.46-1.6.17-.05a6.61,6.61,0,0,0,1-.42l.16-.08,1.45.81a.49.49,0,0,0,.59-.08l1.14-1.13a.5.5,0,0,0,.09-.6L16.5,14l.08-.15a6.26,6.26,0,0,0,.41-1l.05-.17,1.6-.46A.5.5,0,0,0,19,11.8V10.18A.5.5,0,0,0,18.64,9.7Z"
                      ></path>
                      <path
                        class="tool-light"
                        d="M9.46,8.11,8.44,9h.74a1.45,1.45,0,0,1,.29,0A2.48,2.48,0,0,1,11,8.5a2.5,2.5,0,0,1,0,5,2.32,2.32,0,0,1-.65-.1,1.57,1.57,0,0,1-1.17.6H6.55a.44.44,0,0,1,0,.28l-.75,1.37.6.6,1.36-.77a.51.51,0,0,1,.48,0l.4.2a5.63,5.63,0,0,0,.8.36l.42.13a.49.49,0,0,1,.33.34L10.58,18h.84l.44-1.49a.49.49,0,0,1,.33-.34l.42-.13a6.23,6.23,0,0,0,.81-.36l.39-.2a.51.51,0,0,1,.48,0l1.36.77.6-.6-.75-1.37a.49.49,0,0,1,0-.47l.21-.39a6.1,6.1,0,0,0,.34-.81l.13-.43a.5.5,0,0,1,.34-.32L18,11.43v-.87l-1.5-.43a.51.51,0,0,1-.34-.33L16,9.38a5.47,5.47,0,0,0-.32-.81l-.21-.4a.49.49,0,0,1,0-.47l.75-1.36-.6-.6-1.36.76a.48.48,0,0,1-.48,0l-.4-.21a5.43,5.43,0,0,0-.8-.35l-.42-.13a.49.49,0,0,1-.33-.34L11.43,4h-.86l-.43,1.48a.51.51,0,0,1-.28.31A1.72,1.72,0,0,1,9.46,8.11Z"
                      ></path>
                      <path
                        class="tool-dark"
                        d="M10.38,9.64A1.44,1.44,0,0,1,11,9.5a1.5,1.5,0,0,1,0,3l-.15,0a2.63,2.63,0,0,1-.5.92,2.32,2.32,0,0,0,.65.1,2.5,2.5,0,0,0,0-5A2.48,2.48,0,0,0,9.47,9,1.68,1.68,0,0,1,10.38,9.64Z"
                      ></path>
                      <path
                        class="tool-dark"
                        d="M4.63,9.34l.52.51a.36.36,0,0,0,.16.11.47.47,0,0,0,.38,0l.09-.06.07-.05,3-3a.5.5,0,0,0,0-.68l0,0a.48.48,0,0,0-.7,0l-.38.37L6.52,7.77,6,8.29V2.5a.5.5,0,0,0-1,0V8.29L2.85,6.15a.49.49,0,0,0-.7.7Z"
                      ></path>
                      <path
                        class="tool-dark"
                        d="M8.5,11h-6a.5.5,0,0,0,0,1h6a.41.41,0,0,0,.19,0,.5.5,0,0,0-.19-1Z"
                      ></path>
                      <path
                        class="tool-white"
                        d="M12.5,11A1.5,1.5,0,0,0,11,9.5a1.44,1.44,0,0,0-.62.14A2.93,2.93,0,0,1,11,11.5a3.1,3.1,0,0,1-.15,1l.15,0A1.5,1.5,0,0,0,12.5,11Z"
                      ></path>
                    </svg>
                  </span>
                </button>
              </div>
              <div class="CmApp-Bar-tool_group hidden-xs hidden-sm">
                <div class="app_bttn_group">
                  <div class="app_bttn app_bttn_white">
                    <span>
                      <a rel="noopener" target="_blank" href="/pricing">
                        Pricing{" "}
                        {/* <span
                          class="glyphicon glyphicon-new-window"
                          style="font-size: smaller;"
                        >
                          {" "}
                        </span> */}
                      </a>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div class="CmApp-Bar-bar_container">
              <div class="CmApp-Bar-tool_group">
                <div class="hidden-xs dropdown">
                  <button
                    class="CmApp-Help-button app_bttn app_bttn_orange dropdown-toggle"
                    data-toggle="button"
                    id="CmApp-Help-Button"
                  >
                    <b>?</b>
                  </button>
                </div>

                <button
                  title="Exit"
                  class="app_bttn  app_bttn_dark exit_app"
                  alt="Exit"
                  id="exit_app"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 9.83 9.83"
                  >
                    <polygon points="9.83 0.71 9.12 0 4.92 4.21 0.71 0 0 0.71 4.21 4.92 0 9.12 0.71 9.83 4.92 5.62 9.12 9.83 9.83 9.12 5.62 4.92 9.83 0.71"></polygon>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="right-sidebar">
          <div class="CmApp-Sidebar-container">
            <div class="CmApp-Sidebar-mode_container">
              <div class="CmApp-Sidebar-item CmApp-Sidebar-mode_title noselect">
                <a
                  rel="noopener"
                  target="_blank"
                  href="/tutorials/processing-modes"
                  class="CmApp-Sidebar-learn_mode"
                >
                  Mode&nbsp;
                  <svg
                    fill-rule="evenodd"
                    height="11px"
                    width="11px"
                    xmlns="http://www.w3.org/2000/svg"
                    version="1.1"
                  >
                    <path
                      stroke-width="1.1"
                      stroke="#00f"
                      d="M10.45,5.5C10.52,2.86 8.14,0.48 5.5,0.55C2.86,0.48 0.48,2.86 0.55,5.5C0.48,8.14 2.86,10.52 5.5,10.45C8.14,10.52 10.52,8.14 10.45,5.5L10.45,5.5ZM10.45,5.5"
                      fill="none"
                    ></path>
                    <path d="M5,4L5,9L6,9L6,4L5,4ZM5,4" fill="#00f"></path>
                    <path
                      d="M6.1,2.5C6.11,2.18 5.82,1.89 5.5,1.9C5.18,1.89 4.89,2.18 4.9,2.5C4.89,2.82 5.18,3.11 5.5,3.1C5.82,3.11 6.11,2.82 6.1,2.5ZM6.1,2.5"
                      fill="#00f"
                    ></path>
                  </svg>
                </a>
              </div>
              <div class="CmApp-Sidebar-item CmApp-Sidebar-mode_item CmApp-Cat-photoMode noselect active">
                Photo
              </div>
              <div class="CmApp-Sidebar-item CmApp-Sidebar-mode_item CmApp-Cat-logoMode noselect disabled">
                Graphics
              </div>
            </div>

            <div
              title="Toggle whether a result is produced automatically"
              class="CmApp-Sidebar-auto_clip active"
            >
              <span class="CmApp-Sidebar-auto_clip_checkbox CmApp-Sidebar-auto_clip_enabled">
                <svg
                  fill-rule="evenodd"
                  height="10px"
                  width="10px"
                  xmlns="http://www.w3.org/2000/svg"
                  version="1.1"
                >
                  <path
                    stroke="#fff"
                    d="M0.5,0.5L0.5,9.5L9.5,9.5L9.5,0.5L0.5,0.5ZM0.5,0.5"
                    fill="none"
                  ></path>
                  <path
                    d="M1.5,5.01L3.7,8.4L5.1,8.4L8.65,1.4L6.9,1.4L4.29,6.49L3.33,5.01L1.5,5.01ZM1.5,5.01"
                    fill="#fff"
                  ></path>
                </svg>
              </span>
              <span class="CmApp-Sidebar-auto_clip_checkbox CmApp-Sidebar-auto_clip_disabled">
                <svg
                  fill-rule="evenodd"
                  height="10px"
                  width="10px"
                  xmlns="http://www.w3.org/2000/svg"
                  version="1.1"
                >
                  <path
                    stroke="#00f"
                    d="M0.5,0.5L0.5,9.5L9.5,9.5L9.5,0.5L0.5,0.5ZM0.5,0.5"
                    fill="none"
                  ></path>
                </svg>
              </span>
              Auto-Clip
            </div>

            <div
              title="Hover to show original (Keyboard: Q)"
              class="CmApp-Sidebar-item CmApp-Sidebar-touchAndGo CmApp-Sidebar-viewOriginal noselect"
            >
              Original
            </div>

            <div
              title="Hover to show result preview (Keyboard: W)"
              class="CmApp-Sidebar-item CmApp-Sidebar-touchAndGo CmApp-Sidebar-preview noselect"
            >
              Preview
            </div>
          </div>
        </div>

        <div className="footer">
          <div class="CmApp-Bar-bar_container">
            <div class="CmApp-Bar-scroll_container">
              <div class="CmApp-Bar-tool_group">
                <button
                  title="Application Preferences"
                  class="CmApp-Tools-tool PreferencesDialog-open "
                  alt="Application Preferences"
                  id="PreferencesDialog-open"
                >
                  <div class="CmApp-Tools-corner_arrow"></div>
                  <span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path
                        class="tool-dark"
                        d="M10.91,19H9.09a.5.5,0,0,1-.48-.36l-.53-1.85-.23-.07a6.1,6.1,0,0,1-1.08-.47l-.21-.11-1.68.94A.47.47,0,0,1,4.29,17L3,15.72a.51.51,0,0,1-.08-.6l.93-1.68-.11-.21a7.07,7.07,0,0,1-.45-1.08l-.07-.23-1.85-.53A.5.5,0,0,1,1,10.91V9.07a.5.5,0,0,1,.36-.48l1.86-.53.07-.22a6.69,6.69,0,0,1,.44-1.08l.11-.22L2.9,4.87A.51.51,0,0,1,3,4.27L4.29,3a.5.5,0,0,1,.59-.08l1.68.94.21-.11a8.06,8.06,0,0,1,1.08-.47l.23-.07.53-1.83A.5.5,0,0,1,9.09,1h1.82a.5.5,0,0,1,.48.36l.53,1.83.23.07a8.06,8.06,0,0,1,1.08.47l.21.11,1.68-.94a.48.48,0,0,1,.59.08L17,4.27a.51.51,0,0,1,.09.6l-.94,1.67.11.22a6.69,6.69,0,0,1,.44,1.08l.07.22,1.86.53a.5.5,0,0,1,.36.48v1.84a.5.5,0,0,1-.36.48l-1.85.53-.07.23a7.07,7.07,0,0,1-.45,1.08l-.11.21.93,1.68a.51.51,0,0,1-.08.6L15.71,17a.47.47,0,0,1-.59.08l-1.68-.94-.21.11a6.1,6.1,0,0,1-1.08.47l-.23.07-.53,1.85A.51.51,0,0,1,10.91,19Z"
                      ></path>
                      <path
                        class="tool-light"
                        d="M9.47,18h1.06L11,16.26a.5.5,0,0,1,.32-.34l.48-.15a7,7,0,0,0,.93-.4l.45-.24a.51.51,0,0,1,.48,0l1.58.89.75-.75-.87-1.59a.47.47,0,0,1,0-.47l.23-.45a6.14,6.14,0,0,0,.39-.93l.15-.48a.5.5,0,0,1,.34-.32L18,10.53V9.45L16.25,9a.49.49,0,0,1-.34-.33l-.15-.47a6.8,6.8,0,0,0-.38-.93l-.23-.46a.47.47,0,0,1,0-.47L16,4.71,15.28,4l-1.58.88a.48.48,0,0,1-.48,0l-.45-.23a6.06,6.06,0,0,0-.93-.41l-.48-.15A.5.5,0,0,1,11,3.72L10.54,2H9.46L9,3.72a.5.5,0,0,1-.32.34l-.48.15a6.06,6.06,0,0,0-.93.41l-.45.23a.48.48,0,0,1-.48,0L4.72,4,4,4.71l.89,1.58a.51.51,0,0,1,0,.48l-.23.45a6.8,6.8,0,0,0-.38.93l-.15.47A.49.49,0,0,1,3.75,9L2,9.45v1.08L3.74,11a.5.5,0,0,1,.34.32l.15.48a5.74,5.74,0,0,0,.39.93l.23.45a.47.47,0,0,1,0,.47L4,15.28l.75.75,1.58-.89a.51.51,0,0,1,.48,0l.45.24a7,7,0,0,0,.93.4l.48.15a.5.5,0,0,1,.32.34Z"
                      ></path>
                      <path
                        class="tool-dark"
                        d="M10.05,12.83a2.74,2.74,0,1,1,2.74-2.74A2.74,2.74,0,0,1,10.05,12.83Z"
                      ></path>
                      <path
                        class="tool-white"
                        d="M10.05,8.36a1.74,1.74,0,1,0,1.74,1.73A1.74,1.74,0,0,0,10.05,8.36Z"
                      ></path>
                    </svg>
                  </span>
                </button>
                <div class="CmApp-Bar-tool_icon_button_group hidden-xs">
                  <div class="popover_toolbar_no_auto_dismiss dropdown-menu-right">
                    <button
                      title="eCommerce"
                      class="CmApp-Tools-tool popover-button dropdown-toggle CmApp-Tools-ecommerce_defaults"
                      alt="eCommerce"
                      data-toggle="button"
                      id="CmApp-Ecommerce-Popover-Button"
                    >
                      <span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 25 20"
                        >
                          <path
                            class="tool-dark"
                            d="M13.39,5.18A.53.53,0,0,0,13,5H3.23l-.85-.85A.49.49,0,0,0,2,4H.88V5h.94l1,1L4,14.57a.49.49,0,0,0,.49.43h.36a1,1,0,0,0,2,0h2a1,1,0,0,0,2,0h1V14H5l-.29-2H11.8a.5.5,0,0,0,.49-.4l1.2-6A.53.53,0,0,0,13.39,5.18Z"
                          ></path>
                          <path
                            class="tool-dark"
                            d="M7.88,2h11V9.54l1-1v-7a.5.5,0,0,0-.5-.5h-12a.5.5,0,0,0-.5.5V4h1Z"
                          ></path>
                          <path
                            class="tool-dark"
                            d="M19.49,13.17a1.48,1.48,0,0,1-.61.37V18h-11V16h-1v2.5a.5.5,0,0,0,.5.5h12a.5.5,0,0,0,.5-.5V12.78Z"
                          ></path>
                          <path
                            class="tool-dark"
                            d="M18.43,12.61h0a.5.5,0,0,1-.35-.14L15.44,9.83a.5.5,0,0,1,0-.7.5.5,0,0,1,.71,0l2.28,2.28L23.3,6.54a.5.5,0,0,1,.71,0,.48.48,0,0,1,0,.7l-5.23,5.23A.5.5,0,0,1,18.43,12.61Z"
                          ></path>
                          <polygon
                            class="tool-light"
                            points="11.39 11 4.53 11 3.81 6 12.39 6 11.39 11"
                          ></polygon>
                        </svg>
                      </span>
                    </button>
                  </div>
                </div>
              </div>
              <div class="CmApp-Bar-tool_group">
                <div
                  class="popover-button dropdown-toggle popover_toolbar_no_auto_dismiss CmApp-Bar-tool_icon_button_group"
                  data-toggle="button"
                  id="CmApp-Brush-Popover-Button"
                >
                  <div class="CmApp-Tools-label CmApp-Bar-no_padding_right hidden-xs">
                    <span>Brush:</span>
                  </div>
                  <div class="dropdown-menu-right">
                    <button
                      title="Brush Size"
                      class="app_bttn app_bttn_dark CmApp-Tools-brush_tool"
                      alt="Brush Size"
                    >
                      <span class="CmApp-Brush-Size-display popover-button-label">
                        20px
                      </span>
                    </button>
                  </div>
                </div>
                <div class="popover_toolbar_no_auto_dismiss dropdown-menu-right">
                  <div
                    class="popover-button dropdown-toggle CmApp-Bar-tool_icon_button_group"
                    data-toggle="button"
                    // style="cursor: pointer;"
                    id="CmApp-BgColor-Popover-Button"
                  >
                    <div class="CmApp-Tools-label hidden-xs">
                      <span>Background:</span>
                    </div>

                    <div
                      title="Background Color (Keyboard: Cycle: B, Last: G)"
                      class="CmApp-BgColor-toolbar_swatch"
                      alt="Background Color (Keyboard: Cycle: B, Last: G)"
                    >
                      <div class="background-color-swatch-container">
                        <span class="yo-data-uri checker-svg background-color-swatch swatch popover-button-label"></span>
                      </div>
                      <span
                        class="popover-button-label swatch background-color-swatch"
                        id="CmApp-BgColor-CurrentColor"
                        // style="background-color: rgba(255, 255, 255, 0);"
                      ></span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="CmApp-Bar-tool_group">
                <button
                  title="Open Colors Editor"
                  class="CmApp-Tools-tool CmApp-Tools-show_colors_app_button "
                  alt="Open Colors Editor"
                  id="CmApp-Tools-show_colors_app_button"
                >
                  <div class="CmApp-Tools-corner_arrow"></div>
                  <span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <circle class="tool-dark" cx="10" cy="10" r="9"></circle>
                      <path
                        class="tool-white"
                        d="M9.51,18V2A8,8,0,0,0,2,10,8,8,0,0,0,9.51,18Z"
                      ></path>
                      <path
                        class="tool-light"
                        d="M10.51,2V18A7.93,7.93,0,0,0,18,10,8,8,0,0,0,10.51,2Z"
                      ></path>
                    </svg>
                  </span>
                  <span class="hidden_narrow CmApp-Tools-label">Colors</span>
                </button>

                <button
                  title="Open Crop &amp; Rotate Editor"
                  class="CmApp-Tools-tool CmApp-Tools-show_crop_app_button "
                  alt="Open Crop &amp; Rotate Editor"
                  id="CmApp-Tools-show_crop_app_button"
                >
                  <div class="CmApp-Tools-corner_arrow"></div>
                  <span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path
                        class="tool-dark"
                        d="M18,13H14V6H7V2H4V6H1V9H11V19h3V16h4Z"
                      ></path>
                      <polygon
                        class="tool-dark"
                        points="6 13 6 14 7 14 10 14 10 13 7 13 7 10 6 10 6 13"
                      ></polygon>
                      <polygon
                        class="tool-dark"
                        points="5 15 5 10 4 10 4 16 10 16 10 15 5 15"
                      ></polygon>
                      <path
                        class="tool-dark"
                        d="M16.59,2H11.71L12.85.85l-.7-.7-2,2a.48.48,0,0,0,0,.7l2,2,.7-.7L11.71,3h4.88a.41.41,0,0,1,.41.41V10.5h1V3.41A1.41,1.41,0,0,0,16.59,2Z"
                      ></path>
                      <polyline
                        class="tool-light"
                        points="13 7 13 18 12 18 12 9 12 8 11 8 2 8 2 7 13 7"
                      ></polyline>
                      <rect
                        class="tool-white"
                        x="5"
                        y="3"
                        width="1"
                        height="3"
                      ></rect>
                      <rect
                        class="tool-white"
                        x="14"
                        y="14"
                        width="3"
                        height="1"
                      ></rect>
                    </svg>
                  </span>
                  <span class="hidden_narrow CmApp-Tools-label">Crop</span>
                </button>

                <button
                  title="Open Shadow Editor"
                  class="CmApp-Tools-tool CmApp-Tools-show_shadow_app_button "
                  alt="Open Shadow Editor"
                  id="CmApp-Tools-show_shadow_app_button"
                >
                  <div class="CmApp-Tools-corner_arrow"></div>
                  <span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path
                        class="tool-dark"
                        d="M17.88,6h-3V2a1,1,0,0,0-1-1h-12a1,1,0,0,0-1,1V14a1,1,0,0,0,1,1h3v3a1,1,0,0,0,1,1h12a1,1,0,0,0,1-1V7A1,1,0,0,0,17.88,6Z"
                      ></path>
                      <polygon
                        class="tool-white"
                        points="1.89 14 1.89 2 13.88 2 13.88 5.99 13.88 7 13.88 14 1.89 14"
                      ></polygon>
                      <path
                        class="tool-light"
                        d="M5.88,18V15h8a1,1,0,0,0,1-1V7h3V18Z"
                      ></path>
                    </svg>
                  </span>
                  <span class="hidden_narrow CmApp-Tools-label">Shadows</span>
                </button>
              </div>
              <div class="CmApp-Bar-tool_group">
                <div class="CmApp-Bar-tool_icon_button_group">
                  <div class="CmApp-Tools-label CmApp-Bar-no_padding_right">
                    <span>Edges:</span>
                  </div>
                  <div class="popover_toolbar_no_auto_dismiss dropdown-menu-right">
                    <button
                      title="Refine Edges: Smoothing, Feathering, Offset"
                      class="app_bttn app_bttn_dark popover-button dropdown-toggle"
                      alt="Refine Edges: Smoothing, Feathering, Offset"
                      data-toggle="button"
                      // style="white-space: nowrap;"
                      id="CmApp-Edges-Popover-Button"
                    >
                      <span id="blur-offset-smooth-button-label"> 1, 1, 0</span>
                    </button>
                  </div>
                </div>
                <div class="CmApp-Bar-tool_icon_button_group hidden-xs">
                  <div class="popover_toolbar_no_auto_dismiss dropdown-menu-right">
                    <button
                      title="Review"
                      class="app_bttn app_bttn_dark popover-button dropdown-toggle"
                      alt="Review"
                      data-toggle="button"
                      id="CmApp-Review-Popover-Button"
                    >
                      <span>Review</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ToastContainer autoClose={5000} />
      </div>
    );
  }
}

export default IndividualPosterNew;
