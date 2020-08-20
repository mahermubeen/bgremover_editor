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
import Tab from "../components/Tab.js";
import SideTab from "../components/SideTab.js";
import SideTabsControl from "../components/SideTabsControl.js";
import TabsControl from "../components/TabsControl.js";

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
      hide: false,
      settingPopup: false,
      brushSizePopover: false,
      ecommercePopover: false,
      bgcolorPopover: false,
      edgesPopover: false,
      reviewPopover: false,
      colorsPopover: false,

      BrushSettingsPopup: false,
      BgSettingsPopup: false,
      ColorsSettingsPopup: false,
      CropModeSettingsPopup: false,

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
          <div className="CmApp-Bar-container CmApp-Bar-top_bar noselect">
            <div className="CmApp-Bar-bar_container">
              <div
                className="mark-tools CmApp-Bar-tool_group"
                data-toggle="buttons"
              >
                <div className="CmApp-Tools-mark_tools">
                  <label
                    title="Keep Tool (Keyboard: Toggle Spacebar)"
                    className="tool-radio-button green-tool CmApp-Tools-tool CmApp-Tools-tool_radio_button"
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
                          className="tool-dark"
                          cx="9.88"
                          cy="10"
                          r="10"
                        ></circle>
                        <path
                          className="tool-light"
                          d="M9.88,1a9,9,0,1,0,9,9,9,9,0,0,0-9-9Z"
                        ></path>
                        <polygon
                          className="tool-white"
                          points="15 9 11 9 11 5 9 5 9 9 5 9 5 11 9 11 9 15 11 15 11 11 15 11 15 9"
                        ></polygon>
                      </svg>
                    </span>
                  </label>

                  <label
                    title="Remove Tool (Keyboard: Toggle Spacebar)"
                    className="tool-radio-button red-tool CmApp-Tools-tool CmApp-Tools-tool_radio_button"
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
                          className="tool-dark"
                          d="M10,0A10,10,0,1,0,20,10,10,10,0,0,0,10,0Z"
                        ></path>
                        <circle
                          className="tool-light"
                          cx="10"
                          cy="10"
                          r="9"
                        ></circle>
                        <rect
                          className="tool-white"
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
                    className="CmApp-Cat-onlyIsPhotoMode tool-radio-button hair-tool CmApp-Tools-tool CmApp-Tools-tool_radio_button"
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
                          className="tool-dark"
                          d="M10,0A10,10,0,1,0,20,10,10,10,0,0,0,10,0Z"
                        ></path>
                        <circle
                          className="tool-light"
                          cx="10"
                          cy="10"
                          r="9"
                        ></circle>
                        <path
                          className="tool-black"
                          d="m 11.711864,4.440678 h 2 L 8.2881357,15.559322 H 6.2881356 Z"
                        ></path>
                      </svg>
                    </span>
                  </label>

                  <label
                    title="Eraser (Keyboard: X)"
                    className="tool-radio-button erase-tool CmApp-Tools-tool CmApp-Tools-tool_radio_button"
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
                          className="tool-dark"
                          d="M18.93,7.34,12.54.94a.53.53,0,0,0-.71,0l-8.9,8.9a.51.51,0,0,0,0,.71l.34.34L1,13.14a.47.47,0,0,0-.15.35.49.49,0,0,0,.15.36l5,5a.51.51,0,0,0,.7,0L9,16.63l.3.31a.53.53,0,0,0,.36.15.51.51,0,0,0,.35-.15L18.93,8A.5.5,0,0,0,18.93,7.34ZM9.68,15.88,4,10.2,12.18,2l5.69,5.69Z"
                        ></path>
                        <rect
                          className="tool-light"
                          x="5.14"
                          y="4.92"
                          width="11.58"
                          height="8.04"
                          transform="translate(-3.12 10.35) rotate(-45)"
                        ></rect>
                        <rect
                          className="tool-white"
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
                    className="tool-radio-button sword-tool CmApp-Tools-tool CmApp-Tools-tool_radio_button"
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
                          className="tool-dark"
                          d="M17.87,16.16l-8-8h0l-7-7A.5.5,0,0,0,2,1.54l1,12a.5.5,0,0,0,.24.39A.59.59,0,0,0,3.5,14a.43.43,0,0,0,.19,0l4.69-1.87,6.77,6.76a.47.47,0,0,0,.35.15.52.52,0,0,0,.35-.14l2-2a.51.51,0,0,0,.15-.35A.55.55,0,0,0,17.87,16.16Z"
                        ></path>
                        <path
                          className="tool-white"
                          d="M3.11,2.82l5.3,5.29a1.22,1.22,0,0,0-.07.17,4.29,4.29,0,0,0-.56,3L3.94,12.78Z"
                        ></path>
                        <path
                          className="tool-light"
                          d="M15.5,17.8,8.85,11.15c-.44-.45,0-1.47.32-2.28l7.64,7.64Z"
                        ></path>
                      </svg>
                    </span>
                  </label>

                  <label
                    title="Pan Tool (Keyboard: Shift or C)"
                    className="tool-radio-button pan-tool CmApp-Tools-tool CmApp-Tools-tool_radio_button active"
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
                          className="tool-dark"
                          d="M9.49,18.18H8.25l-.83,0a.5.5,0,0,1-.49-.59,1.49,1.49,0,0,0-.06-.94c-.18-.15-.43-.38-.66-.61l-.54-.5-.91-1a7.75,7.75,0,0,1-.54-.84c-.21-.36-.47-.79-.8-1.28a6.14,6.14,0,0,0-.55-.65,5.34,5.34,0,0,1-.81-1,2.31,2.31,0,0,1-.23-1.79A1.76,1.76,0,0,1,3.77,7.72a2.57,2.57,0,0,1,1.56.68l.08.07c-.07-.19-.13-.35-.2-.51S5.08,7.64,5,7.48a7.57,7.57,0,0,0-.3-.74l-.21-.46A13.23,13.23,0,0,1,4,4.7,2,2,0,0,1,4.35,3a2,2,0,0,1,2-.54,2.58,2.58,0,0,1,1.21,1A4.78,4.78,0,0,1,8,4.38c0-.15,0-.31,0-.47s.07-.67.09-.82a1.74,1.74,0,0,1,1-1.39,2.29,2.29,0,0,1,1.87,0,1.67,1.67,0,0,1,1,1.39,2.12,2.12,0,0,1,.62-.44,1.9,1.9,0,0,1,2,.37,2.42,2.42,0,0,1,.64,1.5c0,.29,0,.62,0,.93,0,.13,0,.26,0,.37l0,0,.11-.18a2,2,0,0,1,.91-.77,1.46,1.46,0,0,1,1.14,0,1.67,1.67,0,0,1,.89.9,2.75,2.75,0,0,1,0,1.16l0,.22a9.22,9.22,0,0,1-.37,1.77c-.1.35-.22.91-.35,1.66l-.06.29c-.08.5-.22,1.26-.33,1.65A6.55,6.55,0,0,1,16.45,14a6.94,6.94,0,0,0-1.16,1.7,2.46,2.46,0,0,0-.08.65,2.18,2.18,0,0,0,0,.28,3.2,3.2,0,0,0,.1.8.49.49,0,0,1-.06.41.51.51,0,0,1-.35.22,6,6,0,0,1-1.43,0c-.62-.09-1.15-.93-1.35-1.27-.24.46-.79,1.22-1.36,1.29A11,11,0,0,1,9.49,18.18ZM8,17.16h.3c.91,0,1.86,0,2.36,0a3.49,3.49,0,0,0,.73-.92.89.89,0,0,1,1.58.05,2.56,2.56,0,0,0,.69.86,3.67,3.67,0,0,0,.59,0,3.37,3.37,0,0,1,0-.55v-.24a3.55,3.55,0,0,1,.1-.83,7.1,7.1,0,0,1,1.35-2.11,5.6,5.6,0,0,0,.58-1.26c.1-.34.23-1.09.31-1.54l.05-.3c.14-.79.27-1.36.37-1.72A9.54,9.54,0,0,0,17.32,7l0-.23a4.74,4.74,0,0,0,0-.7A.65.65,0,0,0,17,5.71a.43.43,0,0,0-.35,0,.93.93,0,0,0-.47.39l-.12.19a3.61,3.61,0,0,0-.29.48c-.12.24-.31.73-.36.86s-.17.46-.26.75a.54.54,0,0,1-.58.36c-.45-.08-.43-.54-.42-.71V7.35c0-.48,0-.9,0-1.53,0-.13,0-.29,0-.45a7.3,7.3,0,0,0,0-.81,1.39,1.39,0,0,0-.37-.89A1,1,0,0,0,13,3.52a1.06,1.06,0,0,0-.57.68,18,18,0,0,0-.28,3c0,.41,0,.76-.05.95a.5.5,0,0,1-.52.47c-.33,0-.44-.09-.48-.56h0v0c0-.23,0-.54,0-1V6.33c0-.49,0-1.09,0-2,0-.13-.08-1-.1-1.08-.06-.47-.26-.6-.41-.66a1.28,1.28,0,0,0-1.05,0,.74.74,0,0,0-.42.65c0,.12-.08.55-.08.67C9,5.11,9,6,9.05,7l0,1.21a.5.5,0,0,1-.45.51.51.51,0,0,1-.54-.4L8,7.81A10.88,10.88,0,0,0,7.4,5.58a7.42,7.42,0,0,0-.7-1.53A1.64,1.64,0,0,0,6,3.44a1,1,0,0,0-.84.19A1,1,0,0,0,5,4.47a10.36,10.36,0,0,0,.45,1.42l.19.44A8.14,8.14,0,0,1,6,7.15a3,3,0,0,0,.16.42,7.15,7.15,0,0,1,.33.89c.16.52.26.92.34,1.25l.09.38h0c0,.18.15.59-.24.78s-.64-.16-.75-.32l-.29-.4a3.07,3.07,0,0,0-.2-.27,9.78,9.78,0,0,0-.72-.72,1.65,1.65,0,0,0-1-.44.76.76,0,0,0-.9.54,1.4,1.4,0,0,0,.17,1,4.42,4.42,0,0,0,.67.83,9,9,0,0,1,.64.77c.34.5.61,1,.83,1.33a7.32,7.32,0,0,0,.44.71l.85.93c.11.1.32.29.52.49l.62.57A1.68,1.68,0,0,1,8,17.16Z"
                        ></path>
                        <path
                          className="tool-light"
                          d="M8,17.16h.3c.91,0,1.86,0,2.36,0a3.49,3.49,0,0,0,.73-.92.89.89,0,0,1,1.58.05,2.56,2.56,0,0,0,.69.86,3.67,3.67,0,0,0,.59,0,3.37,3.37,0,0,1,0-.55v-.24a3.55,3.55,0,0,1,.1-.83,7.1,7.1,0,0,1,1.35-2.11,5.6,5.6,0,0,0,.58-1.26c.1-.34.23-1.09.31-1.54l.05-.3c.14-.79.27-1.36.37-1.72A9.54,9.54,0,0,0,17.32,7l0-.23a4.74,4.74,0,0,0,0-.7A.65.65,0,0,0,17,5.71a.43.43,0,0,0-.35,0,.93.93,0,0,0-.47.39l-.12.19a3.61,3.61,0,0,0-.29.48c-.12.24-.31.73-.36.86s-.17.46-.26.75a.54.54,0,0,1-.58.36c-.45-.08-.43-.54-.42-.71V7.35c0-.48,0-.9,0-1.53,0-.13,0-.29,0-.45a7.3,7.3,0,0,0,0-.81,1.39,1.39,0,0,0-.37-.89A1,1,0,0,0,13,3.52a1.06,1.06,0,0,0-.57.68,18,18,0,0,0-.28,3c0,.41,0,.76-.05.95a.5.5,0,0,1-.52.47c-.33,0-.44-.09-.48-.56h0v0c0-.23,0-.54,0-1V6.33c0-.49,0-1.09,0-2,0-.13-.08-1-.1-1.08-.06-.47-.26-.6-.41-.66a1.28,1.28,0,0,0-1.05,0,.74.74,0,0,0-.42.65c0,.12-.08.55-.08.67C9,5.11,9,6,9.05,7l0,1.21a.5.5,0,0,1-.45.51.51.51,0,0,1-.54-.4L8,7.81A10.88,10.88,0,0,0,7.4,5.58a7.42,7.42,0,0,0-.7-1.53A1.64,1.64,0,0,0,6,3.44a1,1,0,0,0-.84.19A1,1,0,0,0,5,4.47a10.36,10.36,0,0,0,.45,1.42l.19.44A8.14,8.14,0,0,1,6,7.15a3,3,0,0,0,.16.42,7.15,7.15,0,0,1,.33.89c.16.52.26.92.34,1.25l.09.38h0c0,.18.15.59-.24.78s-.64-.16-.75-.32l-.29-.4a3.07,3.07,0,0,0-.2-.27,9.78,9.78,0,0,0-.72-.72,1.65,1.65,0,0,0-1-.44.76.76,0,0,0-.9.54,1.4,1.4,0,0,0,.17,1,4.42,4.42,0,0,0,.67.83,9,9,0,0,1,.64.77c.34.5.61,1,.83,1.33a7.32,7.32,0,0,0,.44.71l.85.93c.11.1.32.29.52.49l.62.57A1.68,1.68,0,0,1,8,17.16Z"
                        ></path>
                        <rect
                          className="tool-dark"
                          x="12.88"
                          y="11"
                          width="1"
                          height="4"
                        ></rect>
                        <rect
                          className="tool-dark"
                          x="10.88"
                          y="11"
                          width="1"
                          height="4"
                          transform="translate(-0.05 0.05) rotate(-0.24)"
                        ></rect>
                        <rect
                          className="tool-dark"
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
              <div className="CmApp-Bar-tool_group CmApp-Bar-tool_group_blue">
                <div className="dropdown">
                  <button
                    aria-expanded="false"
                    type="button"
                    aria-haspopup="true"
                    className="CmApp-Tools-editMenu app_bttn app_bttn_white dropdown-toggle"
                    data-toggle="dropdown"
                    onClick={() => {
                      this.setState({ hide: !this.state.hide });
                    }}
                  >
                    <span className="hidden-xs">Edit</span>
                    <span className="CmApp-Tools-verticalEllipsis">⋮</span>
                    {/* <i className="Icons-down_carrot"></i> */}
                  </button>
                  {this.state.hide ? (
                    <ul className="dropdown-menu modern_menu">
                      <li className="disabled CmApp-Tools-undoMenuItem">
                        <a className="CmApp-Tools-undo" disabled="disabled">
                          <span className="yo-data-uri undo-icon-svg"></span>
                          <span>Undo</span>
                        </a>
                      </li>

                      <li className="disabled CmApp-Tools-redoMenuItem">
                        <a className="CmApp-Tools-redo" disabled="disabled">
                          <span className="yo-data-uri redo-icon-svg"></span>
                          <span>Redo</span>
                        </a>
                      </li>
                      <li role="separator" className="divider"></li>
                      <li
                        className="disabled"
                        title="Please log in to copy/paste masks. "
                        alt="Please log in to copy/paste masks. "
                      >
                        <a className="CmApp-Tools-copy_mask_tool">
                          <span className="yo-data-uri copy-icon-svg"></span>
                          <span>Copy Marks</span>
                        </a>
                      </li>

                      <li
                        className="disabled"
                        title="Please log in to copy/paste masks. "
                        alt="Please log in to copy/paste masks. "
                      >
                        <a className="CmApp-Tools-paste_mask_tool">
                          <span className="yo-data-uri paste-icon-svg"></span>
                          <span>Paste Marks</span>
                        </a>
                      </li>

                      <li className="">
                        <a className="CmApp-Tools-clear_user_mask_tool">
                          <span className="yo-data-uri clear-mask-icon-svg"></span>
                          <span>Clear Marks</span>
                        </a>
                      </li>
                      <li role="separator" className="divider"></li>
                      <li className="">
                        <a className="CmApp-Tools-clear_all_edits">
                          <span className="yo-data-uri revert-icon-svg"></span>
                          <span>Clear All</span>
                        </a>
                      </li>
                    </ul>
                  ) : null}
                </div>

                <button
                  title="Undo (Keyboard: Z)"
                  className="hidden-xs CmApp-Tools-tool CmApp-Tools-undo "
                  alt="Undo (Keyboard: Z)"
                  id="CmApp-Tools-undo"
                  disabled="disabled"
                >
                  <span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path
                        className="tool-dark"
                        d="M11.13,5H4.59L6.74,2.85,6,2.15l-3,3a.5.5,0,0,0,0,.7l3,3,.71-.7L4.59,6h6.54A4.84,4.84,0,0,1,16,10.84v.32A4.84,4.84,0,0,1,11.13,16H3.88v1h7.25A5.85,5.85,0,0,0,17,11.16v-.32A5.85,5.85,0,0,0,11.13,5Z"
                      ></path>
                    </svg>
                  </span>
                </button>

                <button
                  title="Redo (Keyboard: Y)"
                  className="hidden-xs CmApp-Tools-tool CmApp-Tools-redo "
                  alt="Redo (Keyboard: Y)"
                  id="CmApp-Tools-redo"
                  disabled="disabled"
                >
                  <span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path
                        className="tool-dark"
                        d="M13.94,8.85l3-3a.5.5,0,0,0,0-.7l-3-3-.71.7L15.38,5H8.84A5.85,5.85,0,0,0,3,10.84v.32A5.85,5.85,0,0,0,8.84,17h7.25V16H8.84A4.84,4.84,0,0,1,4,11.16v-.32A4.84,4.84,0,0,1,8.84,6h6.54L13.23,8.15Z"
                      ></path>
                    </svg>
                  </span>
                </button>
              </div>
              <div className="CmApp-Bar-tool_group CmApp-Bar-tool_group_blue">
                <button
                  title="Zoom In (Mouse Wheel)"
                  className="CmApp-Tools-tool CmApp-Tools-zoom_in "
                  alt="Zoom In (Mouse Wheel)"
                  id="CmApp-Tools-zoom_in"
                >
                  <span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path
                        className="tool-dark"
                        d="M18.74,17.55l-4.17-4.17a7.56,7.56,0,1,0-.7.71L18,18.26Z"
                      ></path>
                      <path
                        className="tool-light"
                        d="M8.88,2a6.5,6.5,0,1,1-6.5,6.5A6.51,6.51,0,0,1,8.88,2"
                      ></path>
                      <polygon
                        className="tool-dark"
                        points="11.88 8 9.38 8 9.38 5.5 8.38 5.5 8.38 8 5.88 8 5.88 9 8.38 9 8.38 11.5 9.38 11.5 9.38 9 11.88 9 11.88 8"
                      ></polygon>
                    </svg>
                  </span>
                </button>

                <button
                  title="Zoom Out (Mouse Wheel)"
                  className="CmApp-Tools-tool CmApp-Tools-zoom_out "
                  alt="Zoom Out (Mouse Wheel)"
                  id="CmApp-Tools-zoom_out"
                >
                  <span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path
                        className="tool-dark"
                        d="M18.35,17.55l-4.16-4.17A7.5,7.5,0,1,0,8.5,16a7.4,7.4,0,0,0,5-1.91l4.17,4.17Z"
                      ></path>
                      <path
                        className="tool-light"
                        d="M8.5,2A6.5,6.5,0,1,1,2,8.5,6.51,6.51,0,0,1,8.5,2"
                      ></path>
                      <rect
                        className="tool-dark"
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
                  className="CmApp-Tools-tool CmApp-Tools-zoom_to_fit "
                  alt="Zoom to Fit (Keyboard: Home)"
                  id="CmApp-Tools-zoom_to_fit"
                >
                  <span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 20">
                      <path
                        className="tool-dark"
                        d="M1.88,2.37c0-.2.23-.37.49-.37H8.88V1H2.37A1.44,1.44,0,0,0,.88,2.37V8h1Z"
                      ></path>
                      <path
                        className="tool-dark"
                        d="M22.4,1H15.88V2H22.4a.44.44,0,0,1,.48.37V8h1V2.37A1.43,1.43,0,0,0,22.4,1Z"
                      ></path>
                      <path
                        className="tool-dark"
                        d="M22.88,17.63a.44.44,0,0,1-.48.37H15.88v1H22.4a1.43,1.43,0,0,0,1.48-1.37V12h-1Z"
                      ></path>
                      <path
                        className="tool-dark"
                        d="M11.76,10H2A1.07,1.07,0,0,0,.88,11v7A1.07,1.07,0,0,0,2,19h9.75a1.06,1.06,0,0,0,1.12-1V11A1.06,1.06,0,0,0,11.76,10Zm0,8H2c-.07,0-.12,0-.13,0V11A.22.22,0,0,1,2,11h9.75c.07,0,.12,0,.12,0l0,7A.22.22,0,0,1,11.76,18Z"
                      ></path>
                      <path
                        className="tool-dark"
                        d="M14,6.85l.71-.7-2-2a.5.5,0,0,0-.71,0l-2,2,.71.7,1.14-1.14V9h1V5.71Z"
                      ></path>
                      <path
                        className="tool-dark"
                        d="M16,12.15l.71.7,2-2a.5.5,0,0,0,0-.7l-2-2-.71.7L17.18,10h-3.3v1h3.3Z"
                      ></path>
                      <path
                        className="tool-light"
                        d="M2,11a.22.22,0,0,0-.14,0v7s.06,0,.13,0h9.75a.22.22,0,0,0,.14,0l0-7s-.05,0-.12,0Z"
                      ></path>
                    </svg>
                  </span>
                </button>
              </div>
              <div className="CmApp-Bar-tool_group hidden-xs">
                <div
                  className="ViewPanes-group hidden-xs"
                  data-toggle="buttons"
                >
                  <label
                    title="Single Pane View (Keyboard: 1)"
                    className="ViewPanes-marks CmApp-Tools-tool CmApp-Tools-tool_radio_button"
                  >
                    <input
                      type="radio"
                      value="ViewPanes-marks"
                      name="ViewPanes-group"
                      autoComplete="off"
                    />
                    <span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 25 20"
                      >
                        <path
                          className="tool-dark"
                          d="M22.38,19h-20a1.5,1.5,0,0,1-1.5-1.5V2.5A1.5,1.5,0,0,1,2.38,1h20a1.5,1.5,0,0,1,1.5,1.5v15A1.5,1.5,0,0,1,22.38,19Z"
                        ></path>
                        <rect
                          className="tool-light"
                          x="1.88"
                          y="2"
                          width="21"
                          height="16"
                          rx="0.5"
                          ry="0.5"
                        ></rect>
                        <path
                          className="tool-dark"
                          d="M16,13H9.93a.5.5,0,0,1-.43-.75l3-5.24a.52.52,0,0,1,.87,0l3,5.24a.55.55,0,0,1,0,.5A.52.52,0,0,1,16,13Z"
                        ></path>
                        <polygon
                          className="tool-white"
                          points="10.79 12 15.12 12 12.96 8.26 10.79 12"
                        ></polygon>
                      </svg>
                    </span>
                  </label>
                  <label
                    title="Split View (Keyboard: 2)"
                    className="ViewPanes-both CmApp-Tools-tool CmApp-Tools-tool_radio_button active"
                  >
                    <input
                      type="radio"
                      value="ViewPanes-both"
                      name="ViewPanes-group"
                      autoComplete="off"
                    />
                    <span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 25 20"
                      >
                        <path
                          className="tool-dark"
                          d="M22.38,1h-20A1.5,1.5,0,0,0,.88,2.5v15A1.5,1.5,0,0,0,2.38,19h20a1.5,1.5,0,0,0,1.5-1.5V2.5A1.5,1.5,0,0,0,22.38,1Z"
                        ></path>
                        <path
                          className="tool-light"
                          d="M2.38,18a.5.5,0,0,1-.5-.5V2.5a.5.5,0,0,1,.5-.5h9.5V18Z"
                        ></path>
                        <path
                          className="tool-light"
                          d="M22.88,17.5a.5.5,0,0,1-.5.5h-9.5V2h9.5a.5.5,0,0,1,.5.5Z"
                        ></path>
                        <path
                          className="tool-dark"
                          d="M10,13H3.93a.5.5,0,0,1-.43-.75L6.52,7a.52.52,0,0,1,.87,0l3,5.24a.55.55,0,0,1,0,.5A.52.52,0,0,1,10,13Z"
                        ></path>
                        <path
                          className="tool-dark"
                          d="M21,13H14.93a.5.5,0,0,1-.43-.75l3-5.24a.52.52,0,0,1,.87,0l3,5.24a.55.55,0,0,1,0,.5A.52.52,0,0,1,21,13Z"
                        ></path>
                        <polygon
                          className="tool-white"
                          points="4.79 12 9.12 12 6.96 8.26 4.79 12"
                        ></polygon>
                        <polygon
                          className="tool-white"
                          points="15.79 12 20.12 12 17.95 8.26 15.79 12"
                        ></polygon>
                      </svg>
                    </span>
                  </label>
                </div>
              </div>
              <div className="CmApp-Bar-tool_group">
                <button
                  title="Save Edits"
                  className="hidden-xs CmApp-Tools-tool CmApp-Tools-save  disabled"
                  alt="Save Edits"
                  id="CmApp-Tools-save"
                >
                  <span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path
                        className="tool-dark"
                        d="M17.85,5.15l-4-4A.36.36,0,0,0,13.69,1a.41.41,0,0,0-.19,0H2.5a.5.5,0,0,0-.5.5v17a.5.5,0,0,0,.5.5h15a.5.5,0,0,0,.5-.5V5.5A.47.47,0,0,0,17.85,5.15Z"
                      ></path>
                      <rect
                        className="tool-white"
                        x="6"
                        y="2"
                        width="7"
                        height="4"
                      ></rect>
                      <path
                        className="tool-light"
                        d="M17,18H3V2H5V6.5a.5.5,0,0,0,.5.5h8a.5.5,0,0,0,.5-.5V2.71l3,3Z"
                      ></path>
                      <path
                        className="tool-dark"
                        d="M7.5,3a.5.5,0,0,0-.5.5v1a.5.5,0,0,0,1,0v-1A.5.5,0,0,0,7.5,3Z"
                      ></path>

                      <g className="save-face">
                        <path
                          className="tool-dark"
                          d="M7.5,11.25a.5.5,0,0,1-.5-.5V9.25a.5.5,0,0,1,1,0v1.5A.5.5,0,0,1,7.5,11.25Z"
                        ></path>
                        <path
                          className="tool-dark"
                          d="M9.5,17A3.6,3.6,0,0,1,6,13.5a.5.5,0,0,1,.5-.5h6a.5.5,0,0,1,.5.5A3.6,3.6,0,0,1,9.5,17Z"
                        ></path>
                        <path
                          className="tool-dark"
                          d="M11,11.5A1.5,1.5,0,1,1,12.5,10,1.5,1.5,0,0,1,11,11.5Z"
                        ></path>
                        <path
                          className="tool-light"
                          d="M7.05,14A2.59,2.59,0,0,0,9.5,16,2.59,2.59,0,0,0,12,14Z"
                        ></path>
                        <circle
                          className="tool-white"
                          cx="11"
                          cy="10"
                          r="0.5"
                        ></circle>
                      </g>
                      <path
                        className="tool-dark save-check"
                        d="M8.43,16,5.64,13.16a1,1,0,0,1,0-1.42,1,1,0,0,1,1.41,0l1.38,1.38,4.26-4.25a1,1,0,0,1,1.42,0,1,1,0,0,1,0,1.41Z"
                      ></path>
                    </svg>
                  </span>
                </button>

                <button
                  title="Download Result"
                  className="app_bttn app_bttn_dark CmApp-Tools-download"
                  alt="Download Result"
                  id="CmApp-Tools-download"
                >
                  <span className="hidden_narrow mrr-5">
                    <span className="lightState-progress paara">
                      Uploading...{" "}
                    </span>
                    <span className="lightState-connecting paara">
                      Connecting...
                    </span>
                    <span className="lightState-updating paara">
                      Updating...
                    </span>
                    <span className="lightState-updated paara1">
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
                  className="hidden-xs CmApp-Tools-tool PreferencesDialog-openExportOptions "
                  alt="Output Options"
                  onClick={() => {
                    this.setState({ settingPopup: true });
                  }}
                  id="PreferencesDialog-openExportOptions"
                >
                  <div className="CmApp-Tools-corner_arrow"></div>
                  <span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path
                        className="tool-dark"
                        d="M18.64,9.7,17,9.24,17,9.08a5.73,5.73,0,0,0-.39-1L16.5,8l.81-1.45a.5.5,0,0,0-.08-.6L16.08,4.76a.5.5,0,0,0-.59-.08L14,5.5l-.16-.08a5.68,5.68,0,0,0-1-.42l-.17-.06-.46-1.58A.5.5,0,0,0,11.8,3H10.2a.5.5,0,0,0-.48.36L9.26,4.94,9.09,5,9,5.05a2.48,2.48,0,0,1,.85.65l.06.09a.51.51,0,0,0,.28-.31L10.57,4h.86l.43,1.48a.49.49,0,0,0,.33.34l.42.13a5.43,5.43,0,0,1,.8.35l.4.21a.48.48,0,0,0,.48,0l1.36-.76.6.6L15.5,7.7a.49.49,0,0,0,0,.47l.21.4a5.47,5.47,0,0,1,.32.81l.14.42a.51.51,0,0,0,.34.33l1.5.43v.87l-1.49.43a.5.5,0,0,0-.34.32l-.13.43a6.1,6.1,0,0,1-.34.81l-.21.39a.49.49,0,0,0,0,.47l.75,1.37-.6.6-1.36-.77a.51.51,0,0,0-.48,0l-.39.2a6.23,6.23,0,0,1-.81.36l-.42.13a.49.49,0,0,0-.33.34L11.42,18h-.84l-.44-1.49a.49.49,0,0,0-.33-.34L9.39,16a5.63,5.63,0,0,1-.8-.36l-.4-.2a.51.51,0,0,0-.48,0l-1.36.77-.6-.6.75-1.37a.44.44,0,0,0,0-.28H5.48l0,0-.81,1.46a.5.5,0,0,0,.09.6l1.14,1.13a.49.49,0,0,0,.59.08L8,16.49l.16.08a6.61,6.61,0,0,0,1,.42l.17.05.46,1.6a.5.5,0,0,0,.48.36h1.6a.5.5,0,0,0,.48-.36l.46-1.6.17-.05a6.61,6.61,0,0,0,1-.42l.16-.08,1.45.81a.49.49,0,0,0,.59-.08l1.14-1.13a.5.5,0,0,0,.09-.6L16.5,14l.08-.15a6.26,6.26,0,0,0,.41-1l.05-.17,1.6-.46A.5.5,0,0,0,19,11.8V10.18A.5.5,0,0,0,18.64,9.7Z"
                      ></path>
                      <path
                        className="tool-light"
                        d="M9.46,8.11,8.44,9h.74a1.45,1.45,0,0,1,.29,0A2.48,2.48,0,0,1,11,8.5a2.5,2.5,0,0,1,0,5,2.32,2.32,0,0,1-.65-.1,1.57,1.57,0,0,1-1.17.6H6.55a.44.44,0,0,1,0,.28l-.75,1.37.6.6,1.36-.77a.51.51,0,0,1,.48,0l.4.2a5.63,5.63,0,0,0,.8.36l.42.13a.49.49,0,0,1,.33.34L10.58,18h.84l.44-1.49a.49.49,0,0,1,.33-.34l.42-.13a6.23,6.23,0,0,0,.81-.36l.39-.2a.51.51,0,0,1,.48,0l1.36.77.6-.6-.75-1.37a.49.49,0,0,1,0-.47l.21-.39a6.1,6.1,0,0,0,.34-.81l.13-.43a.5.5,0,0,1,.34-.32L18,11.43v-.87l-1.5-.43a.51.51,0,0,1-.34-.33L16,9.38a5.47,5.47,0,0,0-.32-.81l-.21-.4a.49.49,0,0,1,0-.47l.75-1.36-.6-.6-1.36.76a.48.48,0,0,1-.48,0l-.4-.21a5.43,5.43,0,0,0-.8-.35l-.42-.13a.49.49,0,0,1-.33-.34L11.43,4h-.86l-.43,1.48a.51.51,0,0,1-.28.31A1.72,1.72,0,0,1,9.46,8.11Z"
                      ></path>
                      <path
                        className="tool-dark"
                        d="M10.38,9.64A1.44,1.44,0,0,1,11,9.5a1.5,1.5,0,0,1,0,3l-.15,0a2.63,2.63,0,0,1-.5.92,2.32,2.32,0,0,0,.65.1,2.5,2.5,0,0,0,0-5A2.48,2.48,0,0,0,9.47,9,1.68,1.68,0,0,1,10.38,9.64Z"
                      ></path>
                      <path
                        className="tool-dark"
                        d="M4.63,9.34l.52.51a.36.36,0,0,0,.16.11.47.47,0,0,0,.38,0l.09-.06.07-.05,3-3a.5.5,0,0,0,0-.68l0,0a.48.48,0,0,0-.7,0l-.38.37L6.52,7.77,6,8.29V2.5a.5.5,0,0,0-1,0V8.29L2.85,6.15a.49.49,0,0,0-.7.7Z"
                      ></path>
                      <path
                        className="tool-dark"
                        d="M8.5,11h-6a.5.5,0,0,0,0,1h6a.41.41,0,0,0,.19,0,.5.5,0,0,0-.19-1Z"
                      ></path>
                      <path
                        className="tool-white"
                        d="M12.5,11A1.5,1.5,0,0,0,11,9.5a1.44,1.44,0,0,0-.62.14A2.93,2.93,0,0,1,11,11.5a3.1,3.1,0,0,1-.15,1l.15,0A1.5,1.5,0,0,0,12.5,11Z"
                      ></path>
                    </svg>
                  </span>
                </button>
              </div>
              <div className="CmApp-Bar-tool_group hidden-xs hidden-sm">
                <div className="app_bttn_group">
                  <div className="app_bttn app_bttn_white">
                    <span>
                      <a rel="noopener" target="_blank" href="/pricing">
                        Pricing{" "}
                        <span className="glyphicon glyphicon-new-window font-sm">
                          {" "}
                        </span>
                      </a>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="CmApp-Bar-bar_container">
              <div className="CmApp-Bar-tool_group">
                <div className="hidden-xs dropdown">
                  <button
                    className="CmApp-Help-button app_bttn app_bttn_orange dropdown-toggle"
                    data-toggle="button"
                    id="CmApp-Help-Button"
                  >
                    <b>?</b>
                  </button>
                </div>

                <button
                  title="Exit"
                  className="app_bttn  app_bttn_dark exit_app"
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

        <div
          class="canvas-view app-view-sized checkered_222 pan-tool flex"
          id="AppView"
        >
          <canvas style={{ borderRight: "2px solid black" }}></canvas>
          <canvas></canvas>
        </div>

        <div className="right-sidebar">
          <div className="CmApp-Sidebar-container">
            <div className="CmApp-Sidebar-mode_container">
              <div className="CmApp-Sidebar-item CmApp-Sidebar-mode_title noselect">
                <a
                  rel="noopener"
                  target="_blank"
                  href="/tutorials/processing-modes"
                  className="CmApp-Sidebar-learn_mode"
                >
                  Mode&nbsp;
                  <svg
                    fillRule="evenodd"
                    height="11px"
                    width="11px"
                    xmlns="http://www.w3.org/2000/svg"
                    version="1.1"
                  >
                    <path
                      strokeWidth="1.1"
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
              <div className="CmApp-Sidebar-item CmApp-Sidebar-mode_item CmApp-Cat-photoMode noselect active">
                Photo
              </div>
              <div className="CmApp-Sidebar-item CmApp-Sidebar-mode_item CmApp-Cat-logoMode noselect disabled">
                Graphics
              </div>
            </div>

            <div
              title="Toggle whether a result is produced automatically"
              className="CmApp-Sidebar-auto_clip active"
            >
              <span className="CmApp-Sidebar-auto_clip_checkbox CmApp-Sidebar-auto_clip_enabled">
                <svg
                  fillRule="evenodd"
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
              <span className="CmApp-Sidebar-auto_clip_checkbox CmApp-Sidebar-auto_clip_disabled">
                <svg
                  fillRule="evenodd"
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
              className="CmApp-Sidebar-item CmApp-Sidebar-touchAndGo CmApp-Sidebar-viewOriginal noselect"
            >
              Original
            </div>

            <div
              title="Hover to show result preview (Keyboard: W)"
              className="CmApp-Sidebar-item CmApp-Sidebar-touchAndGo CmApp-Sidebar-preview noselect"
            >
              Preview
            </div>
          </div>
        </div>

        <div className="footer">
          <div className="CmApp-Bar-container CmApp-Bar-bottom_bar noselect">
            {this.state.ecommercePopover ? (
              <div
                className="popover top in control-popover exclusive-group CmApp-tool_popover popover_toolbar_no_auto_dismiss"
                id="CmApp-Ecommerce-Popover-Popover"
              >
                <div className="CmApp-tool_popover_content">
                  <div className="max-w-1">
                    <p>
                      eCommerce marketplaces often require that items for sale
                      be on a white background and cropped so that the item is
                      front and center. We recommend making fit-to-result on a
                      white background the default for your images.
                      <span>
                        <a
                          rel="noopener"
                          target="_blank"
                          href="/tutorials/sticky-settings#e-commerce-defaults"
                        >
                          Info{" "}
                          <span className="glyphicon glyphicon-new-window font-sm">
                            {" "}
                          </span>
                        </a>
                      </span>
                    </p>
                    <div className="popover-toolbar h-1 space-nowrap block">
                      <div className="app_bttn_group mrr-5">
                        <button className="CmApp-Ecommerce-set app_bttn_dark app_bttn">
                          Set eCommerce Defaults
                        </button>
                        <button className="CmApp-Ecommerce-revert app_bttn_dark app_bttn">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                          >
                            <path
                              className="tool-dark"
                              d="M11.13,5H4.59L6.74,2.85,6,2.15l-3,3a.5.5,0,0,0,0,.7l3,3,.71-.7L4.59,6h6.54A4.84,4.84,0,0,1,16,10.84v.32A4.84,4.84,0,0,1,11.13,16H3.88v1h7.25A5.85,5.85,0,0,0,17,11.16v-.32A5.85,5.85,0,0,0,11.13,5Z"
                            ></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {this.state.brushSizePopover ? (
              <div
                className="popover top in control-popover exclusive-group CmApp-tool_popover popover_toolbar_no_auto_dismiss"
                id="CmApp-Brush-Popover-Popover"
              >
                <div className="CmApp-tool_popover_content">
                  <div className="popover-toolbar CmApp-Bar-popover_settings h-1 space-nowrap">
                    <div className="CmApp-Tools-label">
                      <span>Brush Size: </span>
                      <span className="CmApp-Brush-Size-display CmApp-Brush-brush_size_inner_display CmApp-Bar-label_bold">
                        20px
                      </span>
                    </div>
                    <div className="app_bttn_group mrr-5">
                      <button
                        title="Decrease Brush Size, shortcut: ["
                        className="CmApp-Brush-Size-decrease app_bttn app_bttn_dark"
                      >
                        <span>-</span>
                      </button>
                      <button
                        title="Increase Brush Size, shortcut: ]"
                        className="CmApp-Brush-Size-increase app_bttn app_bttn_dark"
                      >
                        <span>+</span>
                      </button>
                    </div>
                    <div className="app_bttn_group">
                      <button
                        data-size="5"
                        className="CmApp-Brush-brush_size_button app_bttn app_bttn_dark"
                      >
                        5px
                      </button>
                      <button
                        data-size="10"
                        className="CmApp-Brush-brush_size_button app_bttn app_bttn_dark"
                      >
                        10px
                      </button>
                      <button
                        data-size="20"
                        className="CmApp-Brush-brush_size_button app_bttn app_bttn_dark"
                      >
                        20px
                      </button>
                      <button
                        data-size="30"
                        className="CmApp-Brush-brush_size_button app_bttn app_bttn_dark"
                      >
                        30px
                      </button>
                      <button
                        data-size="40"
                        className="CmApp-Brush-brush_size_button app_bttn app_bttn_dark"
                      >
                        40px
                      </button>
                    </div>
                    <div className="dropup">
                      <div className="dropdown">
                        <button
                          aria-expanded="false"
                          type="button"
                          aria-haspopup="true"
                          className="CmApp-Tools-tool dropdown-toggle CmApp-Tools-sticky_settings_button SettingsGroups-BrushSize-button btn-xs"
                          data-toggle="dropdown"
                          onClick={() => {
                            this.setState({
                              BrushSettingsPopup: !this.state
                                .BrushSettingsPopup,
                            });
                          }}
                        >
                          <span>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                            >
                              <path
                                className="tool-dark"
                                d="M10.91,19H9.09a.5.5,0,0,1-.48-.36l-.53-1.85-.23-.07a6.1,6.1,0,0,1-1.08-.47l-.21-.11-1.68.94A.47.47,0,0,1,4.29,17L3,15.72a.51.51,0,0,1-.08-.6l.93-1.68-.11-.21a7.07,7.07,0,0,1-.45-1.08l-.07-.23-1.85-.53A.5.5,0,0,1,1,10.91V9.07a.5.5,0,0,1,.36-.48l1.86-.53.07-.22a6.69,6.69,0,0,1,.44-1.08l.11-.22L2.9,4.87A.51.51,0,0,1,3,4.27L4.29,3a.5.5,0,0,1,.59-.08l1.68.94.21-.11a8.06,8.06,0,0,1,1.08-.47l.23-.07.53-1.83A.5.5,0,0,1,9.09,1h1.82a.5.5,0,0,1,.48.36l.53,1.83.23.07a8.06,8.06,0,0,1,1.08.47l.21.11,1.68-.94a.48.48,0,0,1,.59.08L17,4.27a.51.51,0,0,1,.09.6l-.94,1.67.11.22a6.69,6.69,0,0,1,.44,1.08l.07.22,1.86.53a.5.5,0,0,1,.36.48v1.84a.5.5,0,0,1-.36.48l-1.85.53-.07.23a7.07,7.07,0,0,1-.45,1.08l-.11.21.93,1.68a.51.51,0,0,1-.08.6L15.71,17a.47.47,0,0,1-.59.08l-1.68-.94-.21.11a6.1,6.1,0,0,1-1.08.47l-.23.07-.53,1.85A.51.51,0,0,1,10.91,19Z"
                              ></path>
                              <path
                                className="tool-light"
                                d="M9.47,18h1.06L11,16.26a.5.5,0,0,1,.32-.34l.48-.15a7,7,0,0,0,.93-.4l.45-.24a.51.51,0,0,1,.48,0l1.58.89.75-.75-.87-1.59a.47.47,0,0,1,0-.47l.23-.45a6.14,6.14,0,0,0,.39-.93l.15-.48a.5.5,0,0,1,.34-.32L18,10.53V9.45L16.25,9a.49.49,0,0,1-.34-.33l-.15-.47a6.8,6.8,0,0,0-.38-.93l-.23-.46a.47.47,0,0,1,0-.47L16,4.71,15.28,4l-1.58.88a.48.48,0,0,1-.48,0l-.45-.23a6.06,6.06,0,0,0-.93-.41l-.48-.15A.5.5,0,0,1,11,3.72L10.54,2H9.46L9,3.72a.5.5,0,0,1-.32.34l-.48.15a6.06,6.06,0,0,0-.93.41l-.45.23a.48.48,0,0,1-.48,0L4.72,4,4,4.71l.89,1.58a.51.51,0,0,1,0,.48l-.23.45a6.8,6.8,0,0,0-.38.93l-.15.47A.49.49,0,0,1,3.75,9L2,9.45v1.08L3.74,11a.5.5,0,0,1,.34.32l.15.48a5.74,5.74,0,0,0,.39.93l.23.45a.47.47,0,0,1,0,.47L4,15.28l.75.75,1.58-.89a.51.51,0,0,1,.48,0l.45.24a7,7,0,0,0,.93.4l.48.15a.5.5,0,0,1,.32.34Z"
                              ></path>
                              <path
                                className="tool-dark"
                                d="M10.05,12.83a2.74,2.74,0,1,1,2.74-2.74A2.74,2.74,0,0,1,10.05,12.83Z"
                              ></path>
                              <path
                                className="tool-white"
                                d="M10.05,8.36a1.74,1.74,0,1,0,1.74,1.73A1.74,1.74,0,0,0,10.05,8.36Z"
                              ></path>
                            </svg>
                          </span>
                        </button>
                        {this.state.BrushSettingsPopup ? (
                          <ul className="dropdown-menu modern_menu dropdown-menu-right">
                            <li className="disabled bg-warning">
                              <a href="#" className="i space-normal">
                                Please log in or create an account to use the
                                default settings feature.{" "}
                              </a>
                            </li>
                            <li role="separator" className="divider"></li>
                            <li className="CmApp-StickySettings-set disabled">
                              <a className="SettingsGroups-BrushSize-setStickyToCurrent disabled">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 15 15"
                                >
                                  <path
                                    className="tool-dark"
                                    d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                  ></path>
                                  <path
                                    className="tool-light"
                                    d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                  ></path>
                                </svg>
                                <span className="CmApp-StickySettings-enabled">
                                  Set as new default
                                </span>
                                <span className="CmApp-StickySettings-disabled">
                                  Using Default
                                </span>
                              </a>
                            </li>
                            <li className="CmApp-StickySettings-reset disabled">
                              <a className="SettingsGroups-BrushSize-setCurrentToDefault disabled">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 15 15"
                                >
                                  <circle
                                    className="tool-light"
                                    cx="8.5"
                                    cy="7.5"
                                    r="1.5"
                                  ></circle>
                                  <path
                                    className="tool-dark"
                                    d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                  ></path>
                                </svg>
                                <span>Reset to default</span>
                              </a>
                            </li>
                            <li role="separator" className="divider"></li>
                            <li className="CmApp-StickySettings-factory disabled">
                              <a className="SettingsGroups-BrushSize-setCurrentAndStickyToFactory disabled">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 15 15"
                                >
                                  <path
                                    className="tool-dark"
                                    d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                  ></path>
                                  <circle
                                    className="tool-light"
                                    cx="8.53"
                                    cy="7.5"
                                    r="1.5"
                                  ></circle>
                                </svg>
                                <span>Restore factory default</span>
                              </a>
                            </li>
                            <li role="separator" className="divider"></li>
                            <li className="">
                              <a className="sticky_settings">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 15 15"
                                >
                                  <rect
                                    className="tool-dark"
                                    x="5.83"
                                    y="2.87"
                                    width="7.99"
                                    height="1.33"
                                    transform="translate(19.66 7.08) rotate(180)"
                                  ></rect>
                                  <rect
                                    className="tool-dark"
                                    x="5.83"
                                    y="6.87"
                                    width="7.99"
                                    height="1.33"
                                    transform="translate(19.66 15.07) rotate(180)"
                                  ></rect>
                                  <rect
                                    className="tool-dark"
                                    x="5.83"
                                    y="10.87"
                                    width="7.99"
                                    height="1.33"
                                    transform="translate(19.66 23.07) rotate(180)"
                                  ></rect>
                                  <circle
                                    className="tool-light"
                                    cx="2.47"
                                    cy="7.5"
                                    r="1.33"
                                  ></circle>
                                  <circle
                                    className="tool-light"
                                    cx="2.47"
                                    cy="3.48"
                                    r="1.33"
                                  ></circle>
                                  <circle
                                    className="tool-light"
                                    cx="2.47"
                                    cy="11.53"
                                    r="1.33"
                                  ></circle>
                                </svg>
                                <span>Show all defaults</span>
                              </a>
                            </li>
                          </ul>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {this.state.bgcolorPopover ? (
              <div
                className="popover top in control-popover exclusive-group CmApp-tool_popover popover_toolbar_no_auto_dismiss"
                id="CmApp-BgColor-Popover-Popover"
              >
                <div className="CmApp-tool_popover_content">
                  <div className="popover-toolbar CmApp-Bar-popover_settings h-1">
                    <div className="CmApp-Tools-label">
                      <span>Background Color:</span>
                    </div>
                    <div
                      className="CmApp-BgColor-picker_group"
                      data-toggle="buttons"
                    >
                      <label
                        title="Transparent"
                        data-color="rgba(255,255,255,0.000000)"
                        className="background-color-swatch-button CmApp-Tools-tool CmApp-Tools-tool_radio_button active"
                        id="background-color-swatch-button-255-255-255-0"
                      >
                        <input
                          type="radio"
                          value="app-radio-bg-255-255-255-0"
                          name="app-radio-bg"
                        />
                        <div className="background-color-swatch-container">
                          <span className="yo-data-uri checker-svg background-color-swatch swatch popover-button-label"></span>
                        </div>
                      </label>
                      <label
                        data-color="rgba(255,255,255,1.000000)"
                        className="background-color-swatch-button CmApp-Tools-tool CmApp-Tools-tool_radio_button"
                        id="background-color-swatch-button-255-255-255-255"
                      >
                        <input
                          type="radio"
                          value="app-radio-bg-255-255-255-255"
                          name="app-radio-bg"
                        />
                        <div className="background-color-swatch-container">
                          <span className="background-color-swatch swatch popover-button-label bg-white"></span>
                        </div>
                      </label>
                      <label
                        data-color="rgba(128,128,128,1.000000)"
                        className="background-color-swatch-button CmApp-Tools-tool CmApp-Tools-tool_radio_button"
                        id="background-color-swatch-button-128-128-128-255"
                      >
                        <input
                          type="radio"
                          value="app-radio-bg-128-128-128-255"
                          name="app-radio-bg"
                        />
                        <div className="background-color-swatch-container">
                          <span className="background-color-swatch swatch popover-button-label bg-gray-1"></span>
                        </div>
                      </label>
                      <label
                        data-color="rgba(0,0,0,1.000000)"
                        className="background-color-swatch-button CmApp-Tools-tool CmApp-Tools-tool_radio_button"
                        id="background-color-swatch-button-0-0-0-255"
                      >
                        <input
                          type="radio"
                          value="app-radio-bg-0-0-0-255"
                          name="app-radio-bg"
                        />
                        <div className="background-color-swatch-container">
                          <span className="background-color-swatch swatch popover-button-label bg-black"></span>
                        </div>
                      </label>
                      <label
                        data-color="rgba(166,85,55,1.000000)"
                        className="background-color-swatch-button CmApp-Tools-tool CmApp-Tools-tool_radio_button"
                        id="background-color-swatch-button-166-85-55-255"
                      >
                        <input
                          type="radio"
                          value="app-radio-bg-166-85-55-255"
                          name="app-radio-bg"
                        />
                        <div className="background-color-swatch-container">
                          <span className="background-color-swatch swatch popover-button-label bg-gray-2"></span>
                        </div>
                      </label>
                      <label
                        data-color="rgba(166,137,55,1.000000)"
                        className="background-color-swatch-button CmApp-Tools-tool CmApp-Tools-tool_radio_button"
                        id="background-color-swatch-button-166-137-55-255"
                      >
                        <input
                          type="radio"
                          value="app-radio-bg-166-137-55-255"
                          name="app-radio-bg"
                        />
                        <div className="background-color-swatch-container">
                          <span className="background-color-swatch swatch popover-button-label bg-gray-3"></span>
                        </div>
                      </label>
                      <label
                        data-color="rgba(63,149,49,1.000000)"
                        className="background-color-swatch-button CmApp-Tools-tool CmApp-Tools-tool_radio_button"
                        id="background-color-swatch-button-63-149-49-255"
                      >
                        <input
                          type="radio"
                          value="app-radio-bg-63-149-49-255"
                          name="app-radio-bg"
                        />
                        <div className="background-color-swatch-container">
                          <span className="background-color-swatch swatch popover-button-label bg-gray-4"></span>
                        </div>
                      </label>
                      <label
                        data-color="rgba(137,174,200,1.000000)"
                        className="background-color-swatch-button CmApp-Tools-tool CmApp-Tools-tool_radio_button"
                        id="background-color-swatch-button-137-174-200-255"
                      >
                        <input
                          type="radio"
                          value="app-radio-bg-137-174-200-255"
                          name="app-radio-bg"
                        />
                        <div className="background-color-swatch-container">
                          <span className="background-color-swatch swatch popover-button-label bg-gray-5"></span>
                        </div>
                      </label>
                      <div className="my-0 mx-1 w-1 h-1 bg-gray-6"></div>
                      <label
                        data-color=""
                        className="background-color-swatch-button CmApp-Tools-tool CmApp-Tools-tool_radio_button"
                        id="background-color-swatch-button-custom"
                      >
                        <input
                          type="radio"
                          value="app-radio-bg-custom"
                          name="app-radio-bg"
                        />
                        <div className="background-color-swatch-container">
                          <span className="background-color-swatch swatch popover-button-label bg-gray-7"></span>
                        </div>
                      </label>
                    </div>
                    <input
                      type="text"
                      value="#90a2e0"
                      name="color-picker-color"
                      className="form-control bg-gray-7 color-white"
                      id="color-picker-color"
                    />
                    <div
                      className="popover top t-auto"
                      id="color-picker-ui-popover"
                    >
                      <div className="arrow"></div>
                      <div className="popover-content">
                        <div id="color-picker-ui">
                          <div className="farbtastic-farbtastic">
                            <div className="farbtastic-color bg-gray-8"></div>
                            <div className="farbtastic-wheel"></div>
                            <div className="farbtastic-overlay"></div>
                            <div className="farbtastic-h-marker farbtastic-marker l-146 t-165"></div>
                            <div className="farbtastic-sl-marker farbtastic-marker l-102 t-110"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="dropup">
                      <div className="dropdown">
                        <button
                          aria-expanded="false"
                          type="button"
                          aria-haspopup="true"
                          className="CmApp-Tools-tool dropdown-toggle CmApp-Tools-sticky_settings_button SettingsGroups-BackgroundColor-button btn-xs"
                          data-toggle="dropdown"
                          onClick={() => {
                            this.setState({
                              BgSettingsPopup: !this.state.BgSettingsPopup,
                            });
                          }}
                        >
                          <span>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                            >
                              <path
                                className="tool-dark"
                                d="M10.91,19H9.09a.5.5,0,0,1-.48-.36l-.53-1.85-.23-.07a6.1,6.1,0,0,1-1.08-.47l-.21-.11-1.68.94A.47.47,0,0,1,4.29,17L3,15.72a.51.51,0,0,1-.08-.6l.93-1.68-.11-.21a7.07,7.07,0,0,1-.45-1.08l-.07-.23-1.85-.53A.5.5,0,0,1,1,10.91V9.07a.5.5,0,0,1,.36-.48l1.86-.53.07-.22a6.69,6.69,0,0,1,.44-1.08l.11-.22L2.9,4.87A.51.51,0,0,1,3,4.27L4.29,3a.5.5,0,0,1,.59-.08l1.68.94.21-.11a8.06,8.06,0,0,1,1.08-.47l.23-.07.53-1.83A.5.5,0,0,1,9.09,1h1.82a.5.5,0,0,1,.48.36l.53,1.83.23.07a8.06,8.06,0,0,1,1.08.47l.21.11,1.68-.94a.48.48,0,0,1,.59.08L17,4.27a.51.51,0,0,1,.09.6l-.94,1.67.11.22a6.69,6.69,0,0,1,.44,1.08l.07.22,1.86.53a.5.5,0,0,1,.36.48v1.84a.5.5,0,0,1-.36.48l-1.85.53-.07.23a7.07,7.07,0,0,1-.45,1.08l-.11.21.93,1.68a.51.51,0,0,1-.08.6L15.71,17a.47.47,0,0,1-.59.08l-1.68-.94-.21.11a6.1,6.1,0,0,1-1.08.47l-.23.07-.53,1.85A.51.51,0,0,1,10.91,19Z"
                              ></path>
                              <path
                                className="tool-light"
                                d="M9.47,18h1.06L11,16.26a.5.5,0,0,1,.32-.34l.48-.15a7,7,0,0,0,.93-.4l.45-.24a.51.51,0,0,1,.48,0l1.58.89.75-.75-.87-1.59a.47.47,0,0,1,0-.47l.23-.45a6.14,6.14,0,0,0,.39-.93l.15-.48a.5.5,0,0,1,.34-.32L18,10.53V9.45L16.25,9a.49.49,0,0,1-.34-.33l-.15-.47a6.8,6.8,0,0,0-.38-.93l-.23-.46a.47.47,0,0,1,0-.47L16,4.71,15.28,4l-1.58.88a.48.48,0,0,1-.48,0l-.45-.23a6.06,6.06,0,0,0-.93-.41l-.48-.15A.5.5,0,0,1,11,3.72L10.54,2H9.46L9,3.72a.5.5,0,0,1-.32.34l-.48.15a6.06,6.06,0,0,0-.93.41l-.45.23a.48.48,0,0,1-.48,0L4.72,4,4,4.71l.89,1.58a.51.51,0,0,1,0,.48l-.23.45a6.8,6.8,0,0,0-.38.93l-.15.47A.49.49,0,0,1,3.75,9L2,9.45v1.08L3.74,11a.5.5,0,0,1,.34.32l.15.48a5.74,5.74,0,0,0,.39.93l.23.45a.47.47,0,0,1,0,.47L4,15.28l.75.75,1.58-.89a.51.51,0,0,1,.48,0l.45.24a7,7,0,0,0,.93.4l.48.15a.5.5,0,0,1,.32.34Z"
                              ></path>
                              <path
                                className="tool-dark"
                                d="M10.05,12.83a2.74,2.74,0,1,1,2.74-2.74A2.74,2.74,0,0,1,10.05,12.83Z"
                              ></path>
                              <path
                                className="tool-white"
                                d="M10.05,8.36a1.74,1.74,0,1,0,1.74,1.73A1.74,1.74,0,0,0,10.05,8.36Z"
                              ></path>
                            </svg>
                          </span>
                        </button>

                        {this.state.BgSettingsPopup ? (
                          <ul className="dropdown-menu modern_menu dropdown-menu-right">
                            <li className="disabled bg-warning">
                              <a href="#" className="i space-normal">
                                Please log in or create an account to use the
                                default settings feature.{" "}
                              </a>
                            </li>
                            <li role="separator" className="divider"></li>
                            <li className="CmApp-StickySettings-set disabled">
                              <a className="SettingsGroups-BackgroundColor-setStickyToCurrent disabled">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 15 15"
                                >
                                  <path
                                    className="tool-dark"
                                    d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                  ></path>
                                  <path
                                    className="tool-light"
                                    d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                  ></path>
                                </svg>
                                <span className="CmApp-StickySettings-enabled">
                                  Set as new default
                                </span>
                                <span className="CmApp-StickySettings-disabled">
                                  Using Default
                                </span>
                              </a>
                            </li>
                            <li className="CmApp-StickySettings-reset disabled">
                              <a className="SettingsGroups-BackgroundColor-setCurrentToDefault disabled">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 15 15"
                                >
                                  <circle
                                    className="tool-light"
                                    cx="8.5"
                                    cy="7.5"
                                    r="1.5"
                                  ></circle>
                                  <path
                                    className="tool-dark"
                                    d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                  ></path>
                                </svg>
                                <span>Reset to default</span>
                              </a>
                            </li>
                            <li role="separator" className="divider"></li>
                            <li className="CmApp-StickySettings-factory disabled">
                              <a className="SettingsGroups-BackgroundColor-setCurrentAndStickyToFactory disabled">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 15 15"
                                >
                                  <path
                                    className="tool-dark"
                                    d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                  ></path>
                                  <circle
                                    className="tool-light"
                                    cx="8.53"
                                    cy="7.5"
                                    r="1.5"
                                  ></circle>
                                </svg>
                                <span>Restore factory default</span>
                              </a>
                            </li>
                            <li role="separator" className="divider"></li>
                            <li className="">
                              <a className="sticky_settings">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 15 15"
                                >
                                  <rect
                                    className="tool-dark"
                                    x="5.83"
                                    y="2.87"
                                    width="7.99"
                                    height="1.33"
                                    transform="translate(19.66 7.08) rotate(180)"
                                  ></rect>
                                  <rect
                                    className="tool-dark"
                                    x="5.83"
                                    y="6.87"
                                    width="7.99"
                                    height="1.33"
                                    transform="translate(19.66 15.07) rotate(180)"
                                  ></rect>
                                  <rect
                                    className="tool-dark"
                                    x="5.83"
                                    y="10.87"
                                    width="7.99"
                                    height="1.33"
                                    transform="translate(19.66 23.07) rotate(180)"
                                  ></rect>
                                  <circle
                                    className="tool-light"
                                    cx="2.47"
                                    cy="7.5"
                                    r="1.33"
                                  ></circle>
                                  <circle
                                    className="tool-light"
                                    cx="2.47"
                                    cy="3.48"
                                    r="1.33"
                                  ></circle>
                                  <circle
                                    className="tool-light"
                                    cx="2.47"
                                    cy="11.53"
                                    r="1.33"
                                  ></circle>
                                </svg>
                                <span>Show all defaults</span>
                              </a>
                            </li>
                          </ul>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {this.state.edgesPopover ? (
              <div
                className="popover top in control-popover exclusive-group CmApp-tool_popover popover_toolbar_no_auto_dismiss"
                id="CmApp-Edges-Popover-Popover"
              >
                <div className="CmApp-tool_popover_content p-0">
                  <div className="CmApp-Cat-onlyIsLogoMode alert alert-info">
                    <p>
                      Corners, Smoothing, and Offset unavailable in{" "}
                      <a
                        rel="noopener"
                        target="_blank"
                        href="/tutorials/processing-modes"
                        className="alert-link"
                      >
                        Graphics Mode{" "}
                        <span className="glyphicon glyphicon-new-window font-sm">
                          {" "}
                        </span>
                      </a>
                    </p>
                  </div>
                </div>
                <div className="CmApp-tool_popover_content">
                  <div className="refine-unit">
                    <p className="CmApp-Tools-label">
                      <a
                        target="tutorial"
                        href="/tutorials/refine-edges#corners"
                      >
                        Corners:
                      </a>
                    </p>
                    <div
                      className="CmApp-Cat-disableInLogoMode app_radio_button_group"
                      data-toggle="buttons"
                    >
                      <label
                        className="use-corner-detection-button app_radio_buttons active"
                        data-usecornerdetection="true"
                        id="use-corner-detection-button-true"
                      >
                        <input
                          type="radio"
                          value="app-radio-usecornerdetection-true"
                          name="app-radio-usecornerdetection"
                        />{" "}
                        On
                      </label>
                      <label
                        className="use-corner-detection-button app_radio_buttons"
                        data-usecornerdetection="false"
                        id="use-corner-detection-button-false"
                      >
                        <input
                          type="radio"
                          value="app-radio-usecornerdetection-false"
                          name="app-radio-usecornerdetection"
                        />{" "}
                        Off
                      </label>
                    </div>
                  </div>
                  <div className="CmApp-Cat-disableInLogoMode refine-unit">
                    <p className="CmApp-Tools-label">
                      <a
                        target="tutorial"
                        href="/tutorials/refine-edges#smoothing"
                      >
                        Smoothing Level
                      </a>
                      :{" "}
                      <span className="CmApp-Bar-label_bold CmApp-Edges-Smoothing-display">
                        1
                      </span>
                    </p>
                    <div
                      className="app_radio_button_group"
                      data-toggle="buttons"
                    >
                      <label
                        data-uselocalsmoothing="true"
                        className="use-local-smoothing-button app_radio_buttons active"
                        id="use-local-smoothing-button-true"
                      >
                        <input
                          type="radio"
                          value="app-radio-uselocalsmoothing-true"
                          name="app-radio-uselocalsmoothing"
                        />{" "}
                        Smart
                      </label>
                      <label
                        data-uselocalsmoothing="false"
                        className="use-local-smoothing-button app_radio_buttons"
                        id="use-local-smoothing-button-false"
                      >
                        <input
                          type="radio"
                          value="app-radio-uselocalsmoothing-false"
                          name="app-radio-uselocalsmoothing"
                        />{" "}
                        Fixed
                      </label>
                    </div>
                    <div className="inline-flex">
                      <div className="app_bttn_group">
                        <button
                          title="Less Smooth"
                          className="app_bttn  app_bttn_dark CmApp-Edges-Smoothing-decrease"
                          alt="Less Smooth"
                          id="CmApp-Edges-Smoothing-decrease"
                        >
                          -
                        </button>
                        <button
                          title="Smoother"
                          className="app_bttn  app_bttn_dark CmApp-Edges-Smoothing-increase"
                          alt="Smoother"
                          id="CmApp-Edges-Smoothing-increase"
                        >
                          +
                        </button>
                        <button
                          className="app_bttn  app_bttn_dark CmApp-Edges-Smoothing-reset disabled"
                          id="CmApp-Edges-Smoothing-reset"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="refine-unit">
                    <p className="CmApp-Tools-label">
                      <a
                        target="tutorial"
                        href="/tutorials/refine-edges#feathering-radius"
                      >
                        Feathering Radius
                      </a>
                      :{" "}
                      <span className="CmApp-Bar-label_bold CmApp-Edges-FeatheringRadius-display">
                        1px
                      </span>
                    </p>
                    <div
                      className="app_radio_button_group"
                      data-toggle="buttons"
                    >
                      <label
                        data-uselocalblur="true"
                        className="use-local-blur-button app_radio_buttons active"
                        id="use-local-blur-button-true"
                      >
                        <input
                          type="radio"
                          value="app-radio-uselocalblur-true"
                          name="app-radio-uselocalblur"
                        />{" "}
                        Smart
                      </label>
                      <label
                        data-uselocalblur="false"
                        className="use-local-blur-button app_radio_buttons"
                        id="use-local-blur-button-false"
                      >
                        <input
                          type="radio"
                          value="app-radio-uselocalblur-false"
                          name="app-radio-uselocalblur"
                        />{" "}
                        Fixed
                      </label>
                    </div>
                    <div className="inline-flex">
                      <div className="app_bttn_group">
                        <button
                          title="Sharper"
                          className="app_bttn  app_bttn_dark CmApp-Edges-FeatheringRadius-decrease"
                          alt="Sharper"
                          id="CmApp-Edges-FeatheringRadius-decrease"
                        >
                          -
                        </button>
                        <button
                          title="Blurrier"
                          className="app_bttn  app_bttn_dark CmApp-Edges-FeatheringRadius-increase"
                          alt="Blurrier"
                          id="CmApp-Edges-FeatheringRadius-increase"
                        >
                          +
                        </button>
                        <button
                          className="disabled app_bttn  app_bttn_dark CmApp-Edges-FeatheringRadius-reset"
                          id="CmApp-Edges-FeatheringRadius-reset"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="CmApp-Cat-disableInLogoMode refine-unit">
                    <p className="CmApp-Tools-label">
                      <a
                        target="tutorial"
                        href="/tutorials/refine-edges#offset"
                      >
                        Offset
                      </a>
                      :{" "}
                      <span className="CmApp-Bar-label_bold CmApp-Edges-Offset-display">
                        0px
                      </span>
                    </p>
                    <div className="inline-flex">
                      <div className="app_bttn_group">
                        <button
                          title="Less Inset"
                          className="app_bttn  app_bttn_dark CmApp-Edges-Offset-decrease disabled"
                          alt="Less Inset"
                          id="CmApp-Edges-Offset-decrease"
                        >
                          -
                        </button>
                        <button
                          title="More Inset"
                          className="app_bttn  app_bttn_dark CmApp-Edges-Offset-increase"
                          alt="More Inset"
                          id="CmApp-Edges-Offset-increase"
                        >
                          +
                        </button>
                        <button
                          className="disabled app_bttn  app_bttn_dark CmApp-Edges-Offset-reset"
                          id="CmApp-Edges-Offset-reset"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="dropup">
                    <div className="dropdown">
                      <button
                        aria-expanded="false"
                        type="button"
                        aria-haspopup="true"
                        className="CmApp-Tools-tool dropdown-toggle CmApp-Tools-sticky_settings_button SettingsGroups-Edges-button btn-xs"
                        data-toggle="dropdown"
                      >
                        <span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                          >
                            <path
                              className="tool-dark"
                              d="M10.91,19H9.09a.5.5,0,0,1-.48-.36l-.53-1.85-.23-.07a6.1,6.1,0,0,1-1.08-.47l-.21-.11-1.68.94A.47.47,0,0,1,4.29,17L3,15.72a.51.51,0,0,1-.08-.6l.93-1.68-.11-.21a7.07,7.07,0,0,1-.45-1.08l-.07-.23-1.85-.53A.5.5,0,0,1,1,10.91V9.07a.5.5,0,0,1,.36-.48l1.86-.53.07-.22a6.69,6.69,0,0,1,.44-1.08l.11-.22L2.9,4.87A.51.51,0,0,1,3,4.27L4.29,3a.5.5,0,0,1,.59-.08l1.68.94.21-.11a8.06,8.06,0,0,1,1.08-.47l.23-.07.53-1.83A.5.5,0,0,1,9.09,1h1.82a.5.5,0,0,1,.48.36l.53,1.83.23.07a8.06,8.06,0,0,1,1.08.47l.21.11,1.68-.94a.48.48,0,0,1,.59.08L17,4.27a.51.51,0,0,1,.09.6l-.94,1.67.11.22a6.69,6.69,0,0,1,.44,1.08l.07.22,1.86.53a.5.5,0,0,1,.36.48v1.84a.5.5,0,0,1-.36.48l-1.85.53-.07.23a7.07,7.07,0,0,1-.45,1.08l-.11.21.93,1.68a.51.51,0,0,1-.08.6L15.71,17a.47.47,0,0,1-.59.08l-1.68-.94-.21.11a6.1,6.1,0,0,1-1.08.47l-.23.07-.53,1.85A.51.51,0,0,1,10.91,19Z"
                            ></path>
                            <path
                              className="tool-light"
                              d="M9.47,18h1.06L11,16.26a.5.5,0,0,1,.32-.34l.48-.15a7,7,0,0,0,.93-.4l.45-.24a.51.51,0,0,1,.48,0l1.58.89.75-.75-.87-1.59a.47.47,0,0,1,0-.47l.23-.45a6.14,6.14,0,0,0,.39-.93l.15-.48a.5.5,0,0,1,.34-.32L18,10.53V9.45L16.25,9a.49.49,0,0,1-.34-.33l-.15-.47a6.8,6.8,0,0,0-.38-.93l-.23-.46a.47.47,0,0,1,0-.47L16,4.71,15.28,4l-1.58.88a.48.48,0,0,1-.48,0l-.45-.23a6.06,6.06,0,0,0-.93-.41l-.48-.15A.5.5,0,0,1,11,3.72L10.54,2H9.46L9,3.72a.5.5,0,0,1-.32.34l-.48.15a6.06,6.06,0,0,0-.93.41l-.45.23a.48.48,0,0,1-.48,0L4.72,4,4,4.71l.89,1.58a.51.51,0,0,1,0,.48l-.23.45a6.8,6.8,0,0,0-.38.93l-.15.47A.49.49,0,0,1,3.75,9L2,9.45v1.08L3.74,11a.5.5,0,0,1,.34.32l.15.48a5.74,5.74,0,0,0,.39.93l.23.45a.47.47,0,0,1,0,.47L4,15.28l.75.75,1.58-.89a.51.51,0,0,1,.48,0l.45.24a7,7,0,0,0,.93.4l.48.15a.5.5,0,0,1,.32.34Z"
                            ></path>
                            <path
                              className="tool-dark"
                              d="M10.05,12.83a2.74,2.74,0,1,1,2.74-2.74A2.74,2.74,0,0,1,10.05,12.83Z"
                            ></path>
                            <path
                              className="tool-white"
                              d="M10.05,8.36a1.74,1.74,0,1,0,1.74,1.73A1.74,1.74,0,0,0,10.05,8.36Z"
                            ></path>
                          </svg>
                        </span>
                      </button>
                      <ul className="dropdown-menu modern_menu dropdown-menu-right hidden">
                        <li className="disabled bg-warning">
                          <a href="#" className="i space-normal">
                            Please log in or create an account to use the
                            default settings feature.{" "}
                          </a>
                        </li>
                        <li role="separator" className="divider"></li>
                        <li className="CmApp-StickySettings-set disabled">
                          <a className="SettingsGroups-Edges-setStickyToCurrent disabled">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 15 15"
                            >
                              <path
                                className="tool-dark"
                                d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                              ></path>
                              <path
                                className="tool-light"
                                d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                              ></path>
                            </svg>
                            <span className="CmApp-StickySettings-enabled">
                              Set as new default
                            </span>
                            <span className="CmApp-StickySettings-disabled">
                              Using Default
                            </span>
                          </a>
                        </li>
                        <li className="CmApp-StickySettings-reset disabled">
                          <a className="SettingsGroups-Edges-setCurrentToDefault disabled">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 15 15"
                            >
                              <circle
                                className="tool-light"
                                cx="8.5"
                                cy="7.5"
                                r="1.5"
                              ></circle>
                              <path
                                className="tool-dark"
                                d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                              ></path>
                            </svg>
                            <span>Reset to default</span>
                          </a>
                        </li>
                        <li role="separator" className="divider"></li>
                        <li className="CmApp-StickySettings-factory disabled">
                          <a className="SettingsGroups-Edges-setCurrentAndStickyToFactory disabled">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 15 15"
                            >
                              <path
                                className="tool-dark"
                                d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                              ></path>
                              <circle
                                className="tool-light"
                                cx="8.53"
                                cy="7.5"
                                r="1.5"
                              ></circle>
                            </svg>
                            <span>Restore factory default</span>
                          </a>
                        </li>
                        <li role="separator" className="divider"></li>
                        <li className="">
                          <a className="sticky_settings">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 15 15"
                            >
                              <rect
                                className="tool-dark"
                                x="5.83"
                                y="2.87"
                                width="7.99"
                                height="1.33"
                                transform="translate(19.66 7.08) rotate(180)"
                              ></rect>
                              <rect
                                className="tool-dark"
                                x="5.83"
                                y="6.87"
                                width="7.99"
                                height="1.33"
                                transform="translate(19.66 15.07) rotate(180)"
                              ></rect>
                              <rect
                                className="tool-dark"
                                x="5.83"
                                y="10.87"
                                width="7.99"
                                height="1.33"
                                transform="translate(19.66 23.07) rotate(180)"
                              ></rect>
                              <circle
                                className="tool-light"
                                cx="2.47"
                                cy="7.5"
                                r="1.33"
                              ></circle>
                              <circle
                                className="tool-light"
                                cx="2.47"
                                cy="3.48"
                                r="1.33"
                              ></circle>
                              <circle
                                className="tool-light"
                                cx="2.47"
                                cy="11.53"
                                r="1.33"
                              ></circle>
                            </svg>
                            <span>Show all defaults</span>
                          </a>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {this.state.reviewPopover ? (
              <div
                className="popover top in control-popover exclusive-group CmApp-tool_popover popover_toolbar_no_auto_dismiss"
                id="CmApp-Review-Popover-Popover"
              >
                <div className="CmApp-tool_popover_content">
                  <div className="CmApp-Tools-label">
                    <span>Review Contour: </span>
                  </div>
                  <div className="app_bttn_group mrr-5">
                    <button
                      title="Scan Backwards, shortcut: D"
                      className="CmApp-Review-Spinner-backward app_bttn app_bttn_dark"
                    >
                      &lt;
                    </button>
                    <button
                      title="Scan Forward, shortcut: F"
                      className="CmApp-Review-Spinner-forward app_bttn app_bttn_dark"
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="CmApp-Bar-bar_container">
              <div className="CmApp-Bar-scroll_container">
                <div className="CmApp-Bar-tool_group">
                  <button
                    title="Application Preferences"
                    className="CmApp-Tools-tool PreferencesDialog-open "
                    alt="Application Preferences"
                    id="PreferencesDialog-open"
                  >
                    <div className="CmApp-Tools-corner_arrow"></div>
                    <span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                      >
                        <path
                          className="tool-dark"
                          d="M10.91,19H9.09a.5.5,0,0,1-.48-.36l-.53-1.85-.23-.07a6.1,6.1,0,0,1-1.08-.47l-.21-.11-1.68.94A.47.47,0,0,1,4.29,17L3,15.72a.51.51,0,0,1-.08-.6l.93-1.68-.11-.21a7.07,7.07,0,0,1-.45-1.08l-.07-.23-1.85-.53A.5.5,0,0,1,1,10.91V9.07a.5.5,0,0,1,.36-.48l1.86-.53.07-.22a6.69,6.69,0,0,1,.44-1.08l.11-.22L2.9,4.87A.51.51,0,0,1,3,4.27L4.29,3a.5.5,0,0,1,.59-.08l1.68.94.21-.11a8.06,8.06,0,0,1,1.08-.47l.23-.07.53-1.83A.5.5,0,0,1,9.09,1h1.82a.5.5,0,0,1,.48.36l.53,1.83.23.07a8.06,8.06,0,0,1,1.08.47l.21.11,1.68-.94a.48.48,0,0,1,.59.08L17,4.27a.51.51,0,0,1,.09.6l-.94,1.67.11.22a6.69,6.69,0,0,1,.44,1.08l.07.22,1.86.53a.5.5,0,0,1,.36.48v1.84a.5.5,0,0,1-.36.48l-1.85.53-.07.23a7.07,7.07,0,0,1-.45,1.08l-.11.21.93,1.68a.51.51,0,0,1-.08.6L15.71,17a.47.47,0,0,1-.59.08l-1.68-.94-.21.11a6.1,6.1,0,0,1-1.08.47l-.23.07-.53,1.85A.51.51,0,0,1,10.91,19Z"
                        ></path>
                        <path
                          className="tool-light"
                          d="M9.47,18h1.06L11,16.26a.5.5,0,0,1,.32-.34l.48-.15a7,7,0,0,0,.93-.4l.45-.24a.51.51,0,0,1,.48,0l1.58.89.75-.75-.87-1.59a.47.47,0,0,1,0-.47l.23-.45a6.14,6.14,0,0,0,.39-.93l.15-.48a.5.5,0,0,1,.34-.32L18,10.53V9.45L16.25,9a.49.49,0,0,1-.34-.33l-.15-.47a6.8,6.8,0,0,0-.38-.93l-.23-.46a.47.47,0,0,1,0-.47L16,4.71,15.28,4l-1.58.88a.48.48,0,0,1-.48,0l-.45-.23a6.06,6.06,0,0,0-.93-.41l-.48-.15A.5.5,0,0,1,11,3.72L10.54,2H9.46L9,3.72a.5.5,0,0,1-.32.34l-.48.15a6.06,6.06,0,0,0-.93.41l-.45.23a.48.48,0,0,1-.48,0L4.72,4,4,4.71l.89,1.58a.51.51,0,0,1,0,.48l-.23.45a6.8,6.8,0,0,0-.38.93l-.15.47A.49.49,0,0,1,3.75,9L2,9.45v1.08L3.74,11a.5.5,0,0,1,.34.32l.15.48a5.74,5.74,0,0,0,.39.93l.23.45a.47.47,0,0,1,0,.47L4,15.28l.75.75,1.58-.89a.51.51,0,0,1,.48,0l.45.24a7,7,0,0,0,.93.4l.48.15a.5.5,0,0,1,.32.34Z"
                        ></path>
                        <path
                          className="tool-dark"
                          d="M10.05,12.83a2.74,2.74,0,1,1,2.74-2.74A2.74,2.74,0,0,1,10.05,12.83Z"
                        ></path>
                        <path
                          className="tool-white"
                          d="M10.05,8.36a1.74,1.74,0,1,0,1.74,1.73A1.74,1.74,0,0,0,10.05,8.36Z"
                        ></path>
                      </svg>
                    </span>
                  </button>
                  <div className="CmApp-Bar-tool_icon_button_group hidden-xs">
                    <div className="popover_toolbar_no_auto_dismiss dropdown-menu-right">
                      <button
                        title="eCommerce"
                        className="CmApp-Tools-tool popover-button dropdown-toggle CmApp-Tools-ecommerce_defaults"
                        alt="eCommerce"
                        data-toggle="button"
                        id="CmApp-Ecommerce-Popover-Button"
                        onClick={() => {
                          this.setState({
                            ecommercePopover: !this.state.ecommercePopover,
                          });
                        }}
                      >
                        <span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 25 20"
                          >
                            <path
                              className="tool-dark"
                              d="M13.39,5.18A.53.53,0,0,0,13,5H3.23l-.85-.85A.49.49,0,0,0,2,4H.88V5h.94l1,1L4,14.57a.49.49,0,0,0,.49.43h.36a1,1,0,0,0,2,0h2a1,1,0,0,0,2,0h1V14H5l-.29-2H11.8a.5.5,0,0,0,.49-.4l1.2-6A.53.53,0,0,0,13.39,5.18Z"
                            ></path>
                            <path
                              className="tool-dark"
                              d="M7.88,2h11V9.54l1-1v-7a.5.5,0,0,0-.5-.5h-12a.5.5,0,0,0-.5.5V4h1Z"
                            ></path>
                            <path
                              className="tool-dark"
                              d="M19.49,13.17a1.48,1.48,0,0,1-.61.37V18h-11V16h-1v2.5a.5.5,0,0,0,.5.5h12a.5.5,0,0,0,.5-.5V12.78Z"
                            ></path>
                            <path
                              className="tool-dark"
                              d="M18.43,12.61h0a.5.5,0,0,1-.35-.14L15.44,9.83a.5.5,0,0,1,0-.7.5.5,0,0,1,.71,0l2.28,2.28L23.3,6.54a.5.5,0,0,1,.71,0,.48.48,0,0,1,0,.7l-5.23,5.23A.5.5,0,0,1,18.43,12.61Z"
                            ></path>
                            <polygon
                              className="tool-light"
                              points="11.39 11 4.53 11 3.81 6 12.39 6 11.39 11"
                            ></polygon>
                          </svg>
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="CmApp-Bar-tool_group">
                  <div
                    className="popover-button dropdown-toggle popover_toolbar_no_auto_dismiss CmApp-Bar-tool_icon_button_group"
                    data-toggle="button"
                    id="CmApp-Brush-Popover-Button"
                  >
                    <div className="CmApp-Tools-label CmApp-Bar-no_padding_right">
                      <span>Brush:</span>
                    </div>
                    <div className="dropdown-menu-right">
                      <button
                        title="Brush Size"
                        className="app_bttn app_bttn_dark CmApp-Tools-brush_tool"
                        alt="Brush Size"
                        onClick={() => {
                          this.setState({
                            brushSizePopover: !this.state.brushSizePopover,
                          });
                        }}
                      >
                        <span className="CmApp-Brush-Size-display popover-button-label">
                          20px
                        </span>
                      </button>
                    </div>
                  </div>
                  <div className="popover_toolbar_no_auto_dismiss dropdown-menu-right">
                    <div
                      className="popover-button dropdown-toggle CmApp-Bar-tool_icon_button_group c-pointer"
                      data-toggle="button"
                      id="CmApp-BgColor-Popover-Button"
                    >
                      <div
                        className="CmApp-Tools-label hidden-xs"
                        onClick={() => {
                          this.setState({
                            bgcolorPopover: !this.state.bgcolorPopover,
                          });
                        }}
                      >
                        <span>Background:</span>
                      </div>

                      <div
                        title="Background Color (Keyboard: Cycle: B, Last: G)"
                        className="CmApp-BgColor-toolbar_swatch"
                        alt="Background Color (Keyboard: Cycle: B, Last: G)"
                      >
                        <div className="background-color-swatch-container">
                          <span className="yo-data-uri checker-svg background-color-swatch swatch popover-button-label"></span>
                        </div>
                        <span
                          className="popover-button-label swatch background-color-swatch bg-gray1"
                          id="CmApp-BgColor-CurrentColor"
                        ></span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="CmApp-Bar-tool_group">
                  <button
                    title="Open Colors Editor"
                    className="CmApp-Tools-tool CmApp-Tools-show_colors_app_button "
                    alt="Open Colors Editor"
                    id="CmApp-Tools-show_colors_app_button"
                    onClick={() => {
                      this.setState({
                        colorsPopover: true,
                      });
                    }}
                  >
                    <div className="CmApp-Tools-corner_arrow"></div>
                    <span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                      >
                        <circle
                          className="tool-dark"
                          cx="10"
                          cy="10"
                          r="9"
                        ></circle>
                        <path
                          className="tool-white"
                          d="M9.51,18V2A8,8,0,0,0,2,10,8,8,0,0,0,9.51,18Z"
                        ></path>
                        <path
                          className="tool-light"
                          d="M10.51,2V18A7.93,7.93,0,0,0,18,10,8,8,0,0,0,10.51,2Z"
                        ></path>
                      </svg>
                    </span>
                    <span className="hidden_narrow CmApp-Tools-label">
                      Colors
                    </span>
                  </button>

                  <button
                    title="Open Crop &amp; Rotate Editor"
                    className="CmApp-Tools-tool CmApp-Tools-show_crop_app_button "
                    alt="Open Crop &amp; Rotate Editor"
                    id="CmApp-Tools-show_crop_app_button"
                    onClick={() => {
                      this.setState({
                        colorsPopover: false,
                      });
                    }}
                  >
                    <div className="CmApp-Tools-corner_arrow"></div>
                    <span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                      >
                        <path
                          className="tool-dark"
                          d="M18,13H14V6H7V2H4V6H1V9H11V19h3V16h4Z"
                        ></path>
                        <polygon
                          className="tool-dark"
                          points="6 13 6 14 7 14 10 14 10 13 7 13 7 10 6 10 6 13"
                        ></polygon>
                        <polygon
                          className="tool-dark"
                          points="5 15 5 10 4 10 4 16 10 16 10 15 5 15"
                        ></polygon>
                        <path
                          className="tool-dark"
                          d="M16.59,2H11.71L12.85.85l-.7-.7-2,2a.48.48,0,0,0,0,.7l2,2,.7-.7L11.71,3h4.88a.41.41,0,0,1,.41.41V10.5h1V3.41A1.41,1.41,0,0,0,16.59,2Z"
                        ></path>
                        <polyline
                          className="tool-light"
                          points="13 7 13 18 12 18 12 9 12 8 11 8 2 8 2 7 13 7"
                        ></polyline>
                        <rect
                          className="tool-white"
                          x="5"
                          y="3"
                          width="1"
                          height="3"
                        ></rect>
                        <rect
                          className="tool-white"
                          x="14"
                          y="14"
                          width="3"
                          height="1"
                        ></rect>
                      </svg>
                    </span>
                    <span className="hidden_narrow CmApp-Tools-label">
                      Crop
                    </span>
                  </button>

                  <button
                    title="Open Shadow Editor"
                    className="CmApp-Tools-tool CmApp-Tools-show_shadow_app_button "
                    alt="Open Shadow Editor"
                    id="CmApp-Tools-show_shadow_app_button"
                    onClick={() => {
                      this.setState({
                        colorsPopover: false,
                      });
                    }}
                  >
                    <div className="CmApp-Tools-corner_arrow"></div>
                    <span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                      >
                        <path
                          className="tool-dark"
                          d="M17.88,6h-3V2a1,1,0,0,0-1-1h-12a1,1,0,0,0-1,1V14a1,1,0,0,0,1,1h3v3a1,1,0,0,0,1,1h12a1,1,0,0,0,1-1V7A1,1,0,0,0,17.88,6Z"
                        ></path>
                        <polygon
                          className="tool-white"
                          points="1.89 14 1.89 2 13.88 2 13.88 5.99 13.88 7 13.88 14 1.89 14"
                        ></polygon>
                        <path
                          className="tool-light"
                          d="M5.88,18V15h8a1,1,0,0,0,1-1V7h3V18Z"
                        ></path>
                      </svg>
                    </span>
                    <span className="hidden_narrow CmApp-Tools-label">
                      Shadows
                    </span>
                  </button>
                </div>
                <div className="CmApp-Bar-tool_group">
                  <div className="CmApp-Bar-tool_icon_button_group">
                    <div className="CmApp-Tools-label CmApp-Bar-no_padding_right">
                      <span>Edges:</span>
                    </div>
                    <div className="popover_toolbar_no_auto_dismiss dropdown-menu-right">
                      <button
                        title="Refine Edges: Smoothing, Feathering, Offset"
                        className="app_bttn app_bttn_dark popover-button dropdown-toggle space-nowrap"
                        alt="Refine Edges: Smoothing, Feathering, Offset"
                        data-toggle="button"
                        id="CmApp-Edges-Popover-Button"
                        onClick={() => {
                          this.setState({
                            edgesPopover: !this.state.edgesPopover,
                          });
                        }}
                      >
                        <span id="blur-offset-smooth-button-label">
                          {" "}
                          1, 1, 0
                        </span>
                      </button>
                    </div>
                  </div>
                  <div className="CmApp-Bar-tool_icon_button_group hidden-xs">
                    <div className="popover_toolbar_no_auto_dismiss dropdown-menu-right">
                      <button
                        title="Review"
                        className="app_bttn app_bttn_dark popover-button dropdown-toggle"
                        alt="Review"
                        data-toggle="button"
                        id="CmApp-Review-Popover-Button"
                        onClick={() => {
                          this.setState({
                            reviewPopover: !this.state.reviewPopover,
                          });
                        }}
                      >
                        <span>Review</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {this.state.settingPopup ? (
          <div
            tabIndex="-1"
            className="modal in"
            id="StickySettingsLightbox block z-1041"
          >
            <div className="modal-dialog modal-lg Modal-dialog Modal-pos_left">
              <div className="Modal-modal_content modal-content">
                <div className="Modal-header">
                  <div className="Modal-title">
                    <i>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                      >
                        <path
                          className="tool-dark"
                          d="M10.91,19H9.09a.5.5,0,0,1-.48-.36l-.53-1.85-.23-.07a6.1,6.1,0,0,1-1.08-.47l-.21-.11-1.68.94A.47.47,0,0,1,4.29,17L3,15.72a.51.51,0,0,1-.08-.6l.93-1.68-.11-.21a7.07,7.07,0,0,1-.45-1.08l-.07-.23-1.85-.53A.5.5,0,0,1,1,10.91V9.07a.5.5,0,0,1,.36-.48l1.86-.53.07-.22a6.69,6.69,0,0,1,.44-1.08l.11-.22L2.9,4.87A.51.51,0,0,1,3,4.27L4.29,3a.5.5,0,0,1,.59-.08l1.68.94.21-.11a8.06,8.06,0,0,1,1.08-.47l.23-.07.53-1.83A.5.5,0,0,1,9.09,1h1.82a.5.5,0,0,1,.48.36l.53,1.83.23.07a8.06,8.06,0,0,1,1.08.47l.21.11,1.68-.94a.48.48,0,0,1,.59.08L17,4.27a.51.51,0,0,1,.09.6l-.94,1.67.11.22a6.69,6.69,0,0,1,.44,1.08l.07.22,1.86.53a.5.5,0,0,1,.36.48v1.84a.5.5,0,0,1-.36.48l-1.85.53-.07.23a7.07,7.07,0,0,1-.45,1.08l-.11.21.93,1.68a.51.51,0,0,1-.08.6L15.71,17a.47.47,0,0,1-.59.08l-1.68-.94-.21.11a6.1,6.1,0,0,1-1.08.47l-.23.07-.53,1.85A.51.51,0,0,1,10.91,19Z"
                        ></path>
                        <path
                          className="tool-light"
                          d="M9.47,18h1.06L11,16.26a.5.5,0,0,1,.32-.34l.48-.15a7,7,0,0,0,.93-.4l.45-.24a.51.51,0,0,1,.48,0l1.58.89.75-.75-.87-1.59a.47.47,0,0,1,0-.47l.23-.45a6.14,6.14,0,0,0,.39-.93l.15-.48a.5.5,0,0,1,.34-.32L18,10.53V9.45L16.25,9a.49.49,0,0,1-.34-.33l-.15-.47a6.8,6.8,0,0,0-.38-.93l-.23-.46a.47.47,0,0,1,0-.47L16,4.71,15.28,4l-1.58.88a.48.48,0,0,1-.48,0l-.45-.23a6.06,6.06,0,0,0-.93-.41l-.48-.15A.5.5,0,0,1,11,3.72L10.54,2H9.46L9,3.72a.5.5,0,0,1-.32.34l-.48.15a6.06,6.06,0,0,0-.93.41l-.45.23a.48.48,0,0,1-.48,0L4.72,4,4,4.71l.89,1.58a.51.51,0,0,1,0,.48l-.23.45a6.8,6.8,0,0,0-.38.93l-.15.47A.49.49,0,0,1,3.75,9L2,9.45v1.08L3.74,11a.5.5,0,0,1,.34.32l.15.48a5.74,5.74,0,0,0,.39.93l.23.45a.47.47,0,0,1,0,.47L4,15.28l.75.75,1.58-.89a.51.51,0,0,1,.48,0l.45.24a7,7,0,0,0,.93.4l.48.15a.5.5,0,0,1,.32.34Z"
                        ></path>
                        <path
                          className="tool-dark"
                          d="M10.05,12.83a2.74,2.74,0,1,1,2.74-2.74A2.74,2.74,0,0,1,10.05,12.83Z"
                        ></path>
                        <path
                          className="tool-white"
                          d="M10.05,8.36a1.74,1.74,0,1,0,1.74,1.73A1.74,1.74,0,0,0,10.05,8.36Z"
                        ></path>
                      </svg>
                    </i>
                    <p className="h4 hidden-sm hidden-xs">Preferences</p>
                  </div>
                  <div className="Modal-close">
                    <button
                      data-dismiss="modal"
                      className=" close outline-none"
                      onClick={() => {
                        this.setState({ settingPopup: false });
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>

                <TabsControl className="tab-content">
                  <Tab name="Default Settings">
                    <div
                      role="tabpanel"
                      className="tab-pane"
                      id="PreferencesDialog-DefaultSettingsPane"
                    >
                      <div className="modal-body Modal-body">
                        <div className="alert alert-warning">
                          <p>
                            Please{" "}
                            <a href="/login">Log In or Create an Account</a> to
                            use the default settings feature.
                          </p>
                        </div>
                        <div className="PreferencesDialog-non_table_contain">
                          <p>
                            <em>
                              The default settings below apply to new images.
                            </em>
                          </p>
                        </div>
                        <table className="table table-hover table-condensed sticky_settings_table Table-settings space-nowrap">
                          <thead>
                            <tr>
                              <th></th>
                              <th>
                                <p className="h4">General</p>
                              </th>
                              <th>Default</th>
                              <th>Current Image</th>
                              <th>Factory Default</th>
                            </tr>
                          </thead>

                          <tbody>
                            <tr>
                              <td></td>
                              <td>Brush Size</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-BrushSize-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-BrushSize-displayDefault">
                                  20px
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-BrushSize-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-BrushSize-displayCurrent">
                                  20px
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Restore factory default"
                                    className="disabled Settings-BrushSize-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-BrushSize-displayFactory">
                                  20px
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>Background Color</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    className="Settings-BackgroundColor-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small disabled"
                                    data-tooltip="Reset to default"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-BackgroundColor-displayDefault">
                                  <div className="background-color-swatch-container">
                                    <span className="background-color-swatch swatch popover-button-label checker-svg absolute"></span>
                                    <span
                                      className="background-color-swatch swatch popover-button-label relative bg-gray1"
                                      id="background-color-current-swatch"
                                    ></span>
                                  </div>
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    className="Settings-BackgroundColor-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small disabled"
                                    data-tooltip="Set as new default"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-BackgroundColor-displayCurrent disabled">
                                  <div className="background-color-swatch-container">
                                    <span className="background-color-swatch swatch popover-button-label checker-svg absolute"></span>
                                    <span
                                      className="background-color-swatch swatch popover-button-label relative bg-gray1"
                                      id="background-color-current-swatch"
                                    ></span>
                                  </div>
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    className="Settings-BackgroundColor-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small disabled"
                                    data-tooltip="Restore factory default"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-BackgroundColor-displayFactory disabled">
                                  <div className="background-color-swatch-container">
                                    <span className="background-color-swatch swatch popover-button-label checker-svg absolute"></span>
                                    <span
                                      className="background-color-swatch swatch popover-button-label relative bg-gray1"
                                      id="background-color-current-swatch"
                                    ></span>
                                  </div>
                                </span>
                              </td>
                            </tr>
                          </tbody>
                          <thead>
                            <tr>
                              <th></th>
                              <th>
                                <p className="h4">Output Options</p>
                              </th>
                              <th>Default</th>
                              <th>Current Image</th>
                              <th>Factory Default</th>
                            </tr>
                          </thead>

                          <tbody>
                            <tr>
                              <td></td>
                              <td>Output Color Space</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-Colors-ColorSpace-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Colors-ColorSpace-displayDefault">
                                  sRGB
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-Colors-ColorSpace-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Colors-ColorSpace-displayCurrent">
                                  sRGB
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Restore factory default"
                                    className="disabled Settings-Colors-ColorSpace-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Colors-ColorSpace-displayFactory">
                                  sRGB
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>Output DPI</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-Crop-Dpi-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Crop-Dpi-displayDefault">
                                  72 DPI
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-Crop-Dpi-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Crop-Dpi-displayCurrent">
                                  72 DPI
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Restore factory default"
                                    className="disabled Settings-Crop-Dpi-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Crop-Dpi-displayFactory">
                                  72 DPI
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>Opaque File Format</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-ExportOptions-OpaqueFileFormat-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-ExportOptions-OpaqueFileFormat-displayDefault">
                                  JPEG
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-ExportOptions-OpaqueFileFormat-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-ExportOptions-OpaqueFileFormat-displayCurrent">
                                  JPEG
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Restore factory default"
                                    className="disabled Settings-ExportOptions-OpaqueFileFormat-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-ExportOptions-OpaqueFileFormat-displayFactory">
                                  JPEG
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>JPEG Quality</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-ExportOptions-JpegQuality-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-ExportOptions-JpegQuality-displayDefault">
                                  75
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-ExportOptions-JpegQuality-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-ExportOptions-JpegQuality-displayCurrent">
                                  75
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Restore factory default"
                                    className="disabled Settings-ExportOptions-JpegQuality-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-ExportOptions-JpegQuality-displayFactory">
                                  75
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>JPEG Optimization</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    className="Settings-ExportOptions-JpegMode-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small disabled"
                                    data-tooltip="Reset to default"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-ExportOptions-JpegMode-displayDefault">
                                  Enabled
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    className="Settings-ExportOptions-JpegMode-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small disabled"
                                    data-tooltip="Set as new default"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-ExportOptions-JpegMode-displayCurrent disabled">
                                  Enabled
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    className="Settings-ExportOptions-JpegMode-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small disabled"
                                    data-tooltip="Restore factory default"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-ExportOptions-JpegMode-displayFactory disabled">
                                  Enabled
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>PNG Optimization</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    className="Settings-ExportOptions-PngMode-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small disabled"
                                    data-tooltip="Reset to default"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-ExportOptions-PngMode-displayDefault">
                                  Lossless
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    className="Settings-ExportOptions-PngMode-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small disabled"
                                    data-tooltip="Set as new default"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-ExportOptions-PngMode-displayCurrent disabled">
                                  Lossless
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    className="Settings-ExportOptions-PngMode-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small disabled"
                                    data-tooltip="Restore factory default"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-ExportOptions-PngMode-displayFactory disabled">
                                  Lossless
                                </span>
                              </td>
                            </tr>
                          </tbody>
                          <thead>
                            <tr>
                              <th></th>
                              <th>
                                <p className="h4">Colors</p>
                              </th>
                              <th>Default</th>
                              <th>Current Image</th>
                              <th>Factory Default</th>
                            </tr>
                          </thead>

                          <tbody>
                            <tr>
                              <td></td>
                              <td>Auto Color Levels</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    className="Settings-Colors-AutoLevels-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small disabled"
                                    data-tooltip="Reset to default"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Colors-AutoLevels-displayDefault">
                                  Off
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    className="Settings-Colors-AutoLevels-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small disabled"
                                    data-tooltip="Set as new default"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Colors-AutoLevels-displayCurrent disabled">
                                  On
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    className="Settings-Colors-AutoLevels-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small disabled"
                                    data-tooltip="Restore factory default"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Colors-AutoLevels-displayFactory disabled">
                                  Off
                                </span>
                              </td>
                            </tr>
                          </tbody>
                          <thead>
                            <tr>
                              <th></th>
                              <th>
                                <p className="h4">Crop &amp; Resize</p>
                              </th>
                              <th>Default</th>
                              <th>Current Image</th>
                              <th>Factory Default</th>
                            </tr>
                          </thead>

                          <tbody>
                            <tr>
                              <td></td>
                              <td>Mode</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-Crop-Mode-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Crop-Mode-displayDefault">
                                  Unconstrained
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-Crop-Mode-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Crop-Mode-displayCurrent">
                                  Unconstrained
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Restore factory default"
                                    className="disabled Settings-Crop-Mode-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Crop-Mode-displayFactory">
                                  Unconstrained
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>Aspect Ratio</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-Crop-AspectRatio-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Crop-AspectRatio-displayDefault">
                                  Unchanged
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-Crop-AspectRatio-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Crop-AspectRatio-displayCurrent">
                                  Unchanged
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Restore factory default"
                                    className="disabled Settings-Crop-AspectRatio-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Crop-AspectRatio-displayFactory">
                                  Unchanged
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>Target Size</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-Crop-TargetSize-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Crop-TargetSize-displayDefault">
                                  Unchanged
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-Crop-TargetSize-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Crop-TargetSize-displayCurrent">
                                  Unchanged
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Restore factory default"
                                    className="disabled Settings-Crop-TargetSize-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Crop-TargetSize-displayFactory">
                                  Unchanged
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>Allow Enlarging</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-Crop-AllowEnlarging-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Crop-AllowEnlarging-displayDefault">
                                  Off
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-Crop-AllowEnlarging-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Crop-AllowEnlarging-displayCurrent">
                                  Off
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Restore factory default"
                                    className="disabled Settings-Crop-AllowEnlarging-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Crop-AllowEnlarging-displayFactory">
                                  Off
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>Fit To Result</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    className="Settings-Crop-FitToResult-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small disabled"
                                    data-tooltip="Reset to default"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Crop-FitToResult-displayDefault">
                                  Off
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    className="Settings-Crop-FitToResult-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small disabled"
                                    data-tooltip="Set as new default"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Crop-FitToResult-displayCurrent disabled">
                                  Off
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    className="Settings-Crop-FitToResult-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small disabled"
                                    data-tooltip="Restore factory default"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Crop-FitToResult-displayFactory disabled">
                                  Off
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>Margin (Percent)</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-Crop-PaddingMils-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Crop-PaddingMils-displayDefault">
                                  5%
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-Crop-PaddingMils-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Crop-PaddingMils-displayCurrent">
                                  5%
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Restore factory default"
                                    className="disabled Settings-Crop-PaddingMils-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Crop-PaddingMils-displayFactory">
                                  5%
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>Margin (Pixels)</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-Crop-PaddingPixels-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Crop-PaddingPixels-displayDefault">
                                  25px
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-Crop-PaddingPixels-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Crop-PaddingPixels-displayCurrent">
                                  25px
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Restore factory default"
                                    className="disabled Settings-Crop-PaddingPixels-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Crop-PaddingPixels-displayFactory">
                                  25px
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>Margin Units</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-Crop-MarginUnits-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Crop-MarginUnits-displayDefault">
                                  Percent
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-Crop-MarginUnits-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Crop-MarginUnits-displayCurrent">
                                  Percent
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    className="Settings-Crop-MarginUnits-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small disabled"
                                    data-tooltip="Restore factory default"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Crop-MarginUnits-displayFactory disabled">
                                  Percent
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>Object Size</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    className="Settings-Crop-ObjectSize-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small disabled"
                                    data-tooltip="Reset to default"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Crop-ObjectSize-displayDefault">
                                  Large
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    className="Settings-Crop-ObjectSize-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small disabled"
                                    data-tooltip="Set as new default"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Crop-ObjectSize-displayCurrent disabled">
                                  Large
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    className="Settings-Crop-ObjectSize-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small disabled"
                                    data-tooltip="Restore factory default"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Crop-ObjectSize-displayFactory disabled">
                                  Large
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>Vertical Alignment</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-Crop-VerticalAlignment-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Crop-VerticalAlignment-displayDefault">
                                  Middle
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-Crop-VerticalAlignment-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Crop-VerticalAlignment-displayCurrent">
                                  Middle
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Restore factory default"
                                    className="disabled Settings-Crop-VerticalAlignment-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Crop-VerticalAlignment-displayFactory">
                                  Middle
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>Shadows</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-Crop-Shadows-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Crop-Shadows-displayDefault">
                                  Pad
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-Crop-Shadows-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Crop-Shadows-displayCurrent">
                                  Pad
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Restore factory default"
                                    className="disabled Settings-Crop-Shadows-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Crop-Shadows-displayFactory">
                                  Pad
                                </span>
                              </td>
                            </tr>
                          </tbody>
                          <thead>
                            <tr>
                              <th></th>
                              <th>
                                <p className="h4">Edges</p>
                              </th>
                              <th>Default</th>
                              <th>Current Image</th>
                              <th>Factory Default</th>
                            </tr>
                          </thead>

                          <tbody>
                            <tr>
                              <td></td>
                              <td>Corners</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-Edge-UseCornerDetection-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Edge-UseCornerDetection-displayDefault">
                                  On
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-Edge-UseCornerDetection-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Edge-UseCornerDetection-displayCurrent">
                                  On
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Restore factory default"
                                    className="disabled Settings-Edge-UseCornerDetection-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Edge-UseCornerDetection-displayFactory">
                                  On
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>Smoothing</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-Edge-UseLocalSmoothing-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Edge-UseLocalSmoothing-displayDefault">
                                  Smart
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-Edge-UseLocalSmoothing-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Edge-UseLocalSmoothing-displayCurrent">
                                  Smart
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Restore factory default"
                                    className="disabled Settings-Edge-UseLocalSmoothing-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Edge-UseLocalSmoothing-displayFactory">
                                  Smart
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>Smoothing Level</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-Edge-SmoothingLevel-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Edge-SmoothingLevel-displayDefault">
                                  1
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-Edge-SmoothingLevel-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Edge-SmoothingLevel-displayCurrent">
                                  1
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Restore factory default"
                                    className="disabled Settings-Edge-SmoothingLevel-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Edge-SmoothingLevel-displayFactory">
                                  1
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>Feathering</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-Edge-UseLocalBlur-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Edge-UseLocalBlur-displayDefault">
                                  Smart
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-Edge-UseLocalBlur-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Edge-UseLocalBlur-displayCurrent">
                                  Smart
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Restore factory default"
                                    className="disabled Settings-Edge-UseLocalBlur-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Edge-UseLocalBlur-displayFactory">
                                  Smart
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>Feathering Radius</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-Edge-SmoothingLevel-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Edge-SmoothingLevel-displayDefault">
                                  1
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-Edge-SmoothingLevel-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Edge-SmoothingLevel-displayCurrent">
                                  1
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Restore factory default"
                                    className="disabled Settings-Edge-SmoothingLevel-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Edge-SmoothingLevel-displayFactory">
                                  1
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>Offset</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-Edge-Offset-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Edge-Offset-displayDefault">
                                  0px
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-Edge-Offset-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Edge-Offset-displayCurrent">
                                  0px
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Restore factory default"
                                    className="disabled Settings-Edge-Offset-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Edge-Offset-displayFactory">
                                  0px
                                </span>
                              </td>
                            </tr>
                          </tbody>
                          <thead>
                            <tr>
                              <th></th>
                              <th>
                                <p className="h4">Oval Shadows</p>
                              </th>
                              <th>Default</th>
                              <th>Current Image</th>
                              <th>Factory Default</th>
                            </tr>
                          </thead>

                          <tbody>
                            <tr>
                              <td></td>
                              <td>Opacity</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-Shadows-Ellipse-Strength-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Shadows-Ellipse-Strength-displayDefault">
                                  50%
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-Shadows-Ellipse-Strength-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Shadows-Ellipse-Strength-displayCurrent">
                                  50%
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Restore factory default"
                                    className="disabled Settings-Shadows-Ellipse-Strength-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Shadows-Ellipse-Strength-displayFactory">
                                  50%
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>Core Size</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-Shadows-Ellipse-Core-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Shadows-Ellipse-Core-displayDefault">
                                  25%
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-Shadows-Ellipse-Core-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Shadows-Ellipse-Core-displayCurrent">
                                  25%
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Restore factory default"
                                    className="disabled Settings-Shadows-Ellipse-Core-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Shadows-Ellipse-Core-displayFactory">
                                  25%
                                </span>
                              </td>
                            </tr>
                          </tbody>
                          <thead>
                            <tr>
                              <th></th>
                              <th>
                                <p className="h4">Drop Shadows</p>
                              </th>
                              <th>Default</th>
                              <th>Current Image</th>
                              <th>Factory Default</th>
                            </tr>
                          </thead>

                          <tbody>
                            <tr>
                              <td></td>
                              <td>Enabled</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    className="Settings-Shadows-Drop-Enabled-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small disabled"
                                    data-tooltip="Reset to default"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Shadows-Drop-Enabled-displayDefault">
                                  Off
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    className="Settings-Shadows-Drop-Enabled-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small disabled"
                                    data-tooltip="Set as new default"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Shadows-Drop-Enabled-displayCurrent disabled">
                                  Off
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    className="Settings-Shadows-Drop-Enabled-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small disabled"
                                    data-tooltip="Restore factory default"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Shadows-Drop-Enabled-displayFactory disabled">
                                  Off
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>Clipping Enabled</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-Shadows-Drop-CropEnabled-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Shadows-Drop-CropEnabled-displayDefault">
                                  Off
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-Shadows-Drop-CropEnabled-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Shadows-Drop-CropEnabled-displayCurrent">
                                  Off
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Restore factory default"
                                    className="disabled Settings-Shadows-Drop-CropEnabled-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Shadows-Drop-CropEnabled-displayFactory">
                                  Off
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>Opacity</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-Shadows-Drop-Opacity-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Shadows-Drop-Opacity-displayDefault">
                                  75%
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-Shadows-Drop-Opacity-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Shadows-Drop-Opacity-displayCurrent">
                                  75%
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Restore factory default"
                                    className="disabled Settings-Shadows-Drop-Opacity-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Shadows-Drop-Opacity-displayFactory">
                                  75%
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>Blur Radius</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-Shadows-Drop-BlurRadius-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Shadows-Drop-BlurRadius-displayDefault">
                                  25px
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-Shadows-Drop-BlurRadius-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Shadows-Drop-BlurRadius-displayCurrent">
                                  25px
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Restore factory default"
                                    className="disabled Settings-Shadows-Drop-BlurRadius-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Shadows-Drop-BlurRadius-displayFactory">
                                  25px
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>Offset X</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-Shadows-Drop-OffsetX-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Shadows-Drop-OffsetX-displayDefault">
                                  30px
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-Shadows-Drop-OffsetX-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Shadows-Drop-OffsetX-displayCurrent">
                                  30px
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Restore factory default"
                                    className="disabled Settings-Shadows-Drop-OffsetX-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Shadows-Drop-OffsetX-displayFactory">
                                  30px
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>Offset Y</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-Shadows-Drop-OffsetY-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Shadows-Drop-OffsetY-displayDefault">
                                  30px
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-Shadows-Drop-OffsetY-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Shadows-Drop-OffsetY-displayCurrent">
                                  30px
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Restore factory default"
                                    className="disabled Settings-Shadows-Drop-OffsetY-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Shadows-Drop-OffsetY-displayFactory">
                                  30px
                                </span>
                              </td>
                            </tr>
                          </tbody>
                          <thead>
                            <tr>
                              <th></th>
                              <th>
                                <p className="h4">Reflections</p>
                              </th>
                              <th>Default</th>
                              <th>Current Image</th>
                              <th>Factory Default</th>
                            </tr>
                          </thead>

                          <tbody>
                            <tr>
                              <td></td>
                              <td>Enabled</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    className="Settings-Shadows-Mirror-Enabled-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small disabled"
                                    data-tooltip="Reset to default"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Shadows-Mirror-Enabled-displayDefault">
                                  Off
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    className="Settings-Shadows-Mirror-Enabled-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small disabled"
                                    data-tooltip="Set as new default"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Shadows-Mirror-Enabled-displayCurrent disabled">
                                  Off
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    className="Settings-Shadows-Mirror-Enabled-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small disabled"
                                    data-tooltip="Restore factory default"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Shadows-Mirror-Enabled-displayFactory disabled">
                                  Off
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>Opacity</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-Shadows-Mirror-Opacity-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Shadows-Mirror-Opacity-displayDefault">
                                  50%
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-Shadows-Mirror-Opacity-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Shadows-Mirror-Opacity-displayCurrent">
                                  50%
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Restore factory default"
                                    className="disabled Settings-Shadows-Mirror-Opacity-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Shadows-Mirror-Opacity-displayFactory">
                                  50%
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>Height</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-Shadows-Mirror-Height-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Shadows-Mirror-Height-displayDefault">
                                  200px
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-Shadows-Mirror-Height-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Shadows-Mirror-Height-displayCurrent">
                                  200px
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Restore factory default"
                                    className="disabled Settings-Shadows-Mirror-Height-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Shadows-Mirror-Height-displayFactory">
                                  200px
                                </span>
                              </td>
                            </tr>
                          </tbody>
                          <thead>
                            <tr>
                              <th></th>
                              <th>
                                <p className="h4">Cast Shadows</p>
                              </th>
                              <th>Default</th>
                              <th>Current Image</th>
                              <th>Factory Default</th>
                            </tr>
                          </thead>

                          <tbody>
                            <tr>
                              <td></td>
                              <td>Enabled</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    className="Settings-Shadows-Perspective-Enabled-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small disabled"
                                    data-tooltip="Reset to default"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Shadows-Perspective-Enabled-displayDefault">
                                  Off
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    className="Settings-Shadows-Perspective-Enabled-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small disabled"
                                    data-tooltip="Set as new default"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Shadows-Perspective-Enabled-displayCurrent disabled">
                                  Off
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    className="Settings-Shadows-Perspective-Enabled-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small disabled"
                                    data-tooltip="Restore factory default"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Shadows-Perspective-Enabled-displayFactory disabled">
                                  Off
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>Opacity</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-Shadows-Perspective-Opacity-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Shadows-Perspective-Opacity-displayDefault">
                                  25%
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-Shadows-Perspective-Opacity-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Shadows-Perspective-Opacity-displayCurrent">
                                  25%
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Restore factory default"
                                    className="disabled Settings-Shadows-Perspective-Opacity-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Shadows-Perspective-Opacity-displayFactory">
                                  25%
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>Opacity Scale</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-Shadows-Perspective-OpacityScale-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Shadows-Perspective-OpacityScale-displayDefault">
                                  50%
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-Shadows-Perspective-OpacityScale-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Shadows-Perspective-OpacityScale-displayCurrent">
                                  50%
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Restore factory default"
                                    className="disabled Settings-Shadows-Perspective-OpacityScale-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Shadows-Perspective-OpacityScale-displayFactory">
                                  50%
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>Blur Radius</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-Shadows-Perspective-BlurRadius-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Shadows-Perspective-BlurRadius-displayDefault">
                                  10px
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-Shadows-Perspective-BlurRadius-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Shadows-Perspective-BlurRadius-displayCurrent">
                                  10px
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Restore factory default"
                                    className="disabled Settings-Shadows-Perspective-BlurRadius-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Shadows-Perspective-BlurRadius-displayFactory">
                                  10px
                                </span>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td>Blur Radius Scale</td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Reset to default"
                                    className="disabled Settings-Shadows-Perspective-BlurRadiusScale-setCurrentToDefault app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <circle
                                        className="tool-light"
                                        cx="8.5"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                      <path
                                        className="tool-dark"
                                        d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="Settings-Shadows-Perspective-BlurRadiusScale-displayDefault">
                                  400%
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Set as new default"
                                    className="disabled Settings-Shadows-Perspective-BlurRadiusScale-setStickyToCurrent app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                      ></path>
                                      <path
                                        className="tool-light"
                                        d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                      ></path>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Shadows-Perspective-BlurRadiusScale-displayCurrent">
                                  400%
                                </span>
                              </td>
                              <td>
                                <div className="app_bttn_group">
                                  <button
                                    data-tooltip="Restore factory default"
                                    className="disabled Settings-Shadows-Perspective-BlurRadiusScale-setCurrentAndStickyToFactory app_bttn app_bttn_dark app_bttn_small"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 15 15"
                                    >
                                      <path
                                        className="tool-dark"
                                        d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                      ></path>
                                      <circle
                                        className="tool-light"
                                        cx="8.53"
                                        cy="7.5"
                                        r="1.5"
                                      ></circle>
                                    </svg>
                                  </button>
                                </div>
                                <span className="disabled Settings-Shadows-Perspective-BlurRadiusScale-displayFactory">
                                  400%
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="modal-footer Modal-footer Modal-mobile_scroll">
                        <div className="mobile_horizontal_scroll">
                          <div className="app_bttn_group disabled">
                            <button
                              title="Reset all settings on current image to default values"
                              className="SettingsGroups-All-setCurrentToDefault app_bttn app_bttn_large app_bttn_dark disabled"
                            >
                              Reset All
                              <span className="hidden_narrow">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 15 15"
                                >
                                  <circle
                                    className="tool-light"
                                    cx="8.5"
                                    cy="7.5"
                                    r="1.5"
                                  ></circle>
                                  <path
                                    className="tool-dark"
                                    d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                  ></path>
                                </svg>
                              </span>
                            </button>

                            <button
                              title="Set all defaults to settings of current image"
                              className="SettingsGroups-All-setStickyToCurrent app_bttn app_bttn_large app_bttn_dark disabled"
                            >
                              Set All
                              <span className="hidden_narrow">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 15 15"
                                >
                                  <path
                                    className="tool-dark"
                                    d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                  ></path>
                                  <path
                                    className="tool-light"
                                    d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                  ></path>
                                </svg>
                              </span>
                            </button>

                            <button
                              title="Restore all factory defaults"
                              className="SettingsGroups-All-setCurrentAndStickyToFactory app_bttn app_bttn_large app_bttn_dark disabled"
                            >
                              Restore All
                              <span className="hidden_narrow">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 15 15"
                                >
                                  <path
                                    className="tool-dark"
                                    d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                  ></path>
                                  <circle
                                    className="tool-light"
                                    cx="8.53"
                                    cy="7.5"
                                    r="1.5"
                                  ></circle>
                                </svg>
                              </span>
                            </button>
                          </div>
                          <div className="app_bttn_group">
                            <button className=" app_bttn app_bttn_dark app_bttn_large sticky_settings_close CmApp-SubApps-subAppCloseButton">
                              Ok
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Tab>
                  <Tab name="Input Options">
                    <div
                      role="tabpanel"
                      className="tab-pane"
                      id="PreferencesDialog-ImportOptionsPane"
                    >
                      <div className="modal-body PreferencesDialog-export_options_body Modal-body">
                        <div className="alert alert-warning">
                          <p>
                            Please{" "}
                            <a href="/login">Log In or Create an Account</a> to
                            use the input options feature.
                          </p>
                        </div>
                        <table className="table table-condensed Table-settings">
                          <thead>
                            <tr>
                              <th> </th>
                              <th colSpan="3">
                                <p className="h4">Input Options</p>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td> </td>
                              <td>
                                <span>Image Size Limit: </span>
                                <span className="MaxNumMegapixels-display">
                                  4 megapixels
                                </span>
                                <div className="inline-flex">
                                  <div className="app_bttn_group">
                                    <button
                                      title="Smaller"
                                      className="app_bttn  app_bttn_dark MaxNumMegapixels-decrease disabled"
                                      alt="Smaller"
                                      id="MaxNumMegapixels-decrease"
                                    >
                                      <span>-</span>
                                    </button>
                                    <button
                                      title="Larger"
                                      className="app_bttn  app_bttn_dark MaxNumMegapixels-increase disabled"
                                      alt="Larger"
                                      id="MaxNumMegapixels-increase"
                                    >
                                      <span>+</span>
                                    </button>
                                  </div>
                                  <div className="app_bttn_group">
                                    <button
                                      title="Reset"
                                      className="app_bttn  app_bttn_dark MaxNumMegapixels-reset disabled"
                                      alt="Reset"
                                      id="MaxNumMegapixels-reset"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          className="tool-dark"
                                          d="M11.13,5H4.59L6.74,2.85,6,2.15l-3,3a.5.5,0,0,0,0,.7l3,3,.71-.7L4.59,6h6.54A4.84,4.84,0,0,1,16,10.84v.32A4.84,4.84,0,0,1,11.13,16H3.88v1h7.25A5.85,5.85,0,0,0,17,11.16v-.32A5.85,5.85,0,0,0,11.13,5Z"
                                        ></path>
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </td>
                              <td>Max: 8</td>
                            </tr>
                            <tr>
                              <td> </td>
                              <td colSpan="3">
                                <p className="comment">
                                  Images that exceed the size limit will be
                                  shrunk to match it.
                                </p>
                                <p className="comment">
                                  We recommend choosing the smallest size limit
                                  that meets your needs. Larger images take
                                  longer to upload and process, and can lead to
                                  a sluggish user interface, especially on older
                                  computers.
                                </p>
                              </td>
                            </tr>
                            <tr>
                              <td> </td>
                              <td colSpan="3">
                                <label className="gray font-normal">
                                  <input
                                    type="checkbox"
                                    className="pre_crop_enabled_checkbox disabled"
                                    disabled="disabled"
                                  />{" "}
                                  Enable Pre-Crop
                                </label>
                                <div>
                                  <p className="comment">
                                    When an image exceeds the size limit,
                                    Pre-Crop allows you to crop out unneeded
                                    parts of the image to maximize the
                                    resolution of the result.
                                  </p>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                          <thead>
                            <tr>
                              <th> </th>
                              <th colSpan="3">
                                <p className="h4">Processing Mode Options</p>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td> </td>
                              <td colSpan="3">
                                <label className="gray font-normal">
                                  <input
                                    type="checkbox"
                                    className="only_use_photo_mode_checkbox disabled"
                                    disabled="disabled"
                                  />{" "}
                                  Always Use Normal Photo Mode For New Images
                                </label>
                                <div>
                                  <p className="comment">
                                    Check this box to not use Graphics Mode for
                                    newly uploaded images.
                                  </p>
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td> </td>
                              <td colSpan="3">
                                <label className="gray font-normal">
                                  <input
                                    type="checkbox"
                                    className="enable_auto_clip_checkbox disabled"
                                    disabled="disabled"
                                  />{" "}
                                  Enable Auto-Clip For New Images
                                </label>
                                <div>
                                  <p className="comment">
                                    Check this box to enable the fully-automatic
                                    Auto-Clip feature when available.
                                  </p>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="modal-footer Modal-footer">
                        <div className="app_bttn_group">
                          <button className="app_bttn app_bttn_dark app_bttn_large sticky_settings_close CmApp-SubApps-subAppCloseButton">
                            Ok
                          </button>
                        </div>
                      </div>
                    </div>
                  </Tab>
                  <Tab name="Output Options">
                    <div
                      role="tabpanel"
                      className="tab-pane active"
                      id="PreferencesDialog-ExportOptionsPane"
                    >
                      <div className="modal-body PreferencesDialog-export_options_body Modal-body">
                        <table className="PreferencesDialog-export_options_table table table-condensed Table-settings">
                          <thead>
                            <tr>
                              <th> </th>
                              <th colSpan="3">
                                <p className="h4">Output Options</p>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="Table-no_border">
                              <td> </td>
                              <td>Color Space:</td>
                              <td>
                                <div className="app_bttn_group dropdown">
                                  <button
                                    aria-expanded="false"
                                    type="button"
                                    aria-haspopup="true"
                                    className="app_bttn app_bttn_dark dropdown-toggle CmApp-ColorsApp-ColorSpace-button"
                                    data-toggle="dropdown"
                                  >
                                    <span className="CmApp-ColorsApp-ColorSpace-display">
                                      sRGB
                                    </span>{" "}
                                    <i className="Icons-down_carrot"></i>
                                    <ul className="dropdown-menu modern_menu hidden">
                                      <li className="">
                                        <a className="CmApp-ColorsApp-ColorSpace-SRgb">
                                          <span>sRGB (Web Standard)</span>
                                        </a>
                                      </li>
                                      <li className="">
                                        <a className="CmApp-ColorsApp-ColorSpace-AdobeRgb">
                                          <span>Adobe RGB (1998)</span>
                                        </a>
                                      </li>
                                      <li className="">
                                        <a className="CmApp-ColorsApp-ColorSpace-AppleRgb">
                                          <span>Apple RGB</span>
                                        </a>
                                      </li>
                                      <li className="">
                                        <a className="CmApp-ColorsApp-ColorSpace-ColorMatchRgb">
                                          <span>ColorMatch RGB</span>
                                        </a>
                                      </li>
                                    </ul>
                                  </button>
                                </div>
                              </td>
                              <td>
                                <div className="dropdown">
                                  <button
                                    aria-expanded="false"
                                    type="button"
                                    aria-haspopup="true"
                                    className="CmApp-Tools-tool dropdown-toggle CmApp-Tools-sticky_settings_button SettingsGroups-Colors-ColorSpace-button btn-xs"
                                    data-toggle="dropdown"
                                  >
                                    <span>
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          className="tool-dark"
                                          d="M10.91,19H9.09a.5.5,0,0,1-.48-.36l-.53-1.85-.23-.07a6.1,6.1,0,0,1-1.08-.47l-.21-.11-1.68.94A.47.47,0,0,1,4.29,17L3,15.72a.51.51,0,0,1-.08-.6l.93-1.68-.11-.21a7.07,7.07,0,0,1-.45-1.08l-.07-.23-1.85-.53A.5.5,0,0,1,1,10.91V9.07a.5.5,0,0,1,.36-.48l1.86-.53.07-.22a6.69,6.69,0,0,1,.44-1.08l.11-.22L2.9,4.87A.51.51,0,0,1,3,4.27L4.29,3a.5.5,0,0,1,.59-.08l1.68.94.21-.11a8.06,8.06,0,0,1,1.08-.47l.23-.07.53-1.83A.5.5,0,0,1,9.09,1h1.82a.5.5,0,0,1,.48.36l.53,1.83.23.07a8.06,8.06,0,0,1,1.08.47l.21.11,1.68-.94a.48.48,0,0,1,.59.08L17,4.27a.51.51,0,0,1,.09.6l-.94,1.67.11.22a6.69,6.69,0,0,1,.44,1.08l.07.22,1.86.53a.5.5,0,0,1,.36.48v1.84a.5.5,0,0,1-.36.48l-1.85.53-.07.23a7.07,7.07,0,0,1-.45,1.08l-.11.21.93,1.68a.51.51,0,0,1-.08.6L15.71,17a.47.47,0,0,1-.59.08l-1.68-.94-.21.11a6.1,6.1,0,0,1-1.08.47l-.23.07-.53,1.85A.51.51,0,0,1,10.91,19Z"
                                        ></path>
                                        <path
                                          className="tool-light"
                                          d="M9.47,18h1.06L11,16.26a.5.5,0,0,1,.32-.34l.48-.15a7,7,0,0,0,.93-.4l.45-.24a.51.51,0,0,1,.48,0l1.58.89.75-.75-.87-1.59a.47.47,0,0,1,0-.47l.23-.45a6.14,6.14,0,0,0,.39-.93l.15-.48a.5.5,0,0,1,.34-.32L18,10.53V9.45L16.25,9a.49.49,0,0,1-.34-.33l-.15-.47a6.8,6.8,0,0,0-.38-.93l-.23-.46a.47.47,0,0,1,0-.47L16,4.71,15.28,4l-1.58.88a.48.48,0,0,1-.48,0l-.45-.23a6.06,6.06,0,0,0-.93-.41l-.48-.15A.5.5,0,0,1,11,3.72L10.54,2H9.46L9,3.72a.5.5,0,0,1-.32.34l-.48.15a6.06,6.06,0,0,0-.93.41l-.45.23a.48.48,0,0,1-.48,0L4.72,4,4,4.71l.89,1.58a.51.51,0,0,1,0,.48l-.23.45a6.8,6.8,0,0,0-.38.93l-.15.47A.49.49,0,0,1,3.75,9L2,9.45v1.08L3.74,11a.5.5,0,0,1,.34.32l.15.48a5.74,5.74,0,0,0,.39.93l.23.45a.47.47,0,0,1,0,.47L4,15.28l.75.75,1.58-.89a.51.51,0,0,1,.48,0l.45.24a7,7,0,0,0,.93.4l.48.15a.5.5,0,0,1,.32.34Z"
                                        ></path>
                                        <path
                                          className="tool-dark"
                                          d="M10.05,12.83a2.74,2.74,0,1,1,2.74-2.74A2.74,2.74,0,0,1,10.05,12.83Z"
                                        ></path>
                                        <path
                                          className="tool-white"
                                          d="M10.05,8.36a1.74,1.74,0,1,0,1.74,1.73A1.74,1.74,0,0,0,10.05,8.36Z"
                                        ></path>
                                      </svg>
                                    </span>
                                  </button>
                                  <ul className="dropdown-menu modern_menu dropdown-menu-right hidden">
                                    <li className="disabled bg-warning">
                                      <a href="#" className="i space-normal">
                                        Please log in or create an account to
                                        use the default settings feature.{" "}
                                      </a>
                                    </li>
                                    <li
                                      role="separator"
                                      className="divider"
                                    ></li>
                                    <li className="CmApp-StickySettings-set disabled">
                                      <a className="SettingsGroups-Colors-ColorSpace-setStickyToCurrent disabled">
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          viewBox="0 0 15 15"
                                        >
                                          <path
                                            className="tool-dark"
                                            d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                          ></path>
                                          <path
                                            className="tool-light"
                                            d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                          ></path>
                                        </svg>
                                        <span className="CmApp-StickySettings-enabled">
                                          Set as new default
                                        </span>
                                        <span className="CmApp-StickySettings-disabled">
                                          Using Default
                                        </span>
                                      </a>
                                    </li>

                                    <li className="CmApp-StickySettings-reset disabled">
                                      <a className="SettingsGroups-Colors-ColorSpace-setCurrentToDefault disabled">
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          viewBox="0 0 15 15"
                                        >
                                          <circle
                                            className="tool-light"
                                            cx="8.5"
                                            cy="7.5"
                                            r="1.5"
                                          ></circle>
                                          <path
                                            className="tool-dark"
                                            d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                          ></path>
                                        </svg>
                                        <span>Reset to default</span>
                                      </a>
                                    </li>
                                    <li
                                      role="separator"
                                      className="divider"
                                    ></li>
                                    <li className="CmApp-StickySettings-factory disabled">
                                      <a className="SettingsGroups-Colors-ColorSpace-setCurrentAndStickyToFactory disabled">
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          viewBox="0 0 15 15"
                                        >
                                          <path
                                            className="tool-dark"
                                            d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                          ></path>
                                          <circle
                                            className="tool-light"
                                            cx="8.53"
                                            cy="7.5"
                                            r="1.5"
                                          ></circle>
                                        </svg>
                                        <span>Restore factory default</span>
                                      </a>
                                    </li>
                                    <li
                                      role="separator"
                                      className="divider"
                                    ></li>
                                    <li className="">
                                      <a className="sticky_settings">
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          viewBox="0 0 15 15"
                                        >
                                          <rect
                                            className="tool-dark"
                                            x="5.83"
                                            y="2.87"
                                            width="7.99"
                                            height="1.33"
                                            transform="translate(19.66 7.08) rotate(180)"
                                          ></rect>
                                          <rect
                                            className="tool-dark"
                                            x="5.83"
                                            y="6.87"
                                            width="7.99"
                                            height="1.33"
                                            transform="translate(19.66 15.07) rotate(180)"
                                          ></rect>
                                          <rect
                                            className="tool-dark"
                                            x="5.83"
                                            y="10.87"
                                            width="7.99"
                                            height="1.33"
                                            transform="translate(19.66 23.07) rotate(180)"
                                          ></rect>
                                          <circle
                                            className="tool-light"
                                            cx="2.47"
                                            cy="7.5"
                                            r="1.33"
                                          ></circle>
                                          <circle
                                            className="tool-light"
                                            cx="2.47"
                                            cy="3.48"
                                            r="1.33"
                                          ></circle>
                                          <circle
                                            className="tool-light"
                                            cx="2.47"
                                            cy="11.53"
                                            r="1.33"
                                          ></circle>
                                        </svg>
                                        <span>Show all defaults</span>
                                      </a>
                                    </li>
                                  </ul>
                                </div>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td colSpan="3" className="comment">
                                <div className="ExportOptions-NoColorSpaceOrDpiInOptimizedOutput-commentRow ExportOptions-NoColorSpaceOrDpiInOptimizedOutput-ColorSpace-comment ExportOptions-NoColorSpaceOrDpiInOptimizedOutput-comment">
                                  Web-optimized output does not contain color
                                  space information.
                                </div>
                              </td>
                            </tr>
                            <tr className="Table-no_border">
                              <td> </td>
                              <td>DPI:</td>
                              <td>
                                <div className="app_bttn_group dropdown">
                                  <button
                                    aria-expanded="false"
                                    type="button"
                                    aria-haspopup="true"
                                    className="app_bttn app_bttn_dark dropdown-toggle"
                                    data-toggle="dropdown"
                                  >
                                    <span className="CmApp-CropApp-Dpi-display">
                                      72 DPI
                                    </span>
                                    <i className="Icons-down_carrot"></i>
                                    <ul className="dropdown-menu modern_menu hidden">
                                      <li className="">
                                        <a className="CmApp-CropApp-DpiPresets-preset72">
                                          <span>72 DPI</span>
                                        </a>
                                      </li>
                                      <li className="">
                                        <a className="CmApp-CropApp-DpiPresets-preset96">
                                          <span>96 DPI</span>
                                        </a>
                                      </li>
                                      <li className="">
                                        <a className="CmApp-CropApp-DpiPresets-preset300">
                                          <span>300 DPI</span>
                                        </a>
                                      </li>
                                    </ul>
                                  </button>
                                </div>
                                <div className="inline-flex">
                                  <div className="app_bttn_group">
                                    <button
                                      title="Lower density"
                                      className="app_bttn  app_bttn_dark CmApp-CropApp-Dpi-decrease"
                                      alt="Lower density"
                                      id="CmApp-CropApp-Dpi-decrease"
                                    >
                                      <span>-</span>
                                    </button>
                                    <button
                                      title="Higher density"
                                      className="app_bttn  app_bttn_dark CmApp-CropApp-Dpi-increase"
                                      alt="Higher density"
                                      id="CmApp-CropApp-Dpi-increase"
                                    >
                                      <span>+</span>
                                    </button>
                                  </div>
                                  <div className="app_bttn_group">
                                    <button
                                      title="Reset"
                                      className="disabled app_bttn  app_bttn_dark CmApp-CropApp-Dpi-reset"
                                      alt="Reset"
                                      id="CmApp-CropApp-Dpi-reset"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          className="tool-dark"
                                          d="M11.13,5H4.59L6.74,2.85,6,2.15l-3,3a.5.5,0,0,0,0,.7l3,3,.71-.7L4.59,6h6.54A4.84,4.84,0,0,1,16,10.84v.32A4.84,4.84,0,0,1,11.13,16H3.88v1h7.25A5.85,5.85,0,0,0,17,11.16v-.32A5.85,5.85,0,0,0,11.13,5Z"
                                        ></path>
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="dropdown">
                                  <button
                                    aria-expanded="false"
                                    type="button"
                                    aria-haspopup="true"
                                    className="CmApp-Tools-tool dropdown-toggle CmApp-Tools-sticky_settings_button SettingsGroups-Crop-Dpi-button btn-xs"
                                    data-toggle="dropdown"
                                  >
                                    <span>
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          className="tool-dark"
                                          d="M10.91,19H9.09a.5.5,0,0,1-.48-.36l-.53-1.85-.23-.07a6.1,6.1,0,0,1-1.08-.47l-.21-.11-1.68.94A.47.47,0,0,1,4.29,17L3,15.72a.51.51,0,0,1-.08-.6l.93-1.68-.11-.21a7.07,7.07,0,0,1-.45-1.08l-.07-.23-1.85-.53A.5.5,0,0,1,1,10.91V9.07a.5.5,0,0,1,.36-.48l1.86-.53.07-.22a6.69,6.69,0,0,1,.44-1.08l.11-.22L2.9,4.87A.51.51,0,0,1,3,4.27L4.29,3a.5.5,0,0,1,.59-.08l1.68.94.21-.11a8.06,8.06,0,0,1,1.08-.47l.23-.07.53-1.83A.5.5,0,0,1,9.09,1h1.82a.5.5,0,0,1,.48.36l.53,1.83.23.07a8.06,8.06,0,0,1,1.08.47l.21.11,1.68-.94a.48.48,0,0,1,.59.08L17,4.27a.51.51,0,0,1,.09.6l-.94,1.67.11.22a6.69,6.69,0,0,1,.44,1.08l.07.22,1.86.53a.5.5,0,0,1,.36.48v1.84a.5.5,0,0,1-.36.48l-1.85.53-.07.23a7.07,7.07,0,0,1-.45,1.08l-.11.21.93,1.68a.51.51,0,0,1-.08.6L15.71,17a.47.47,0,0,1-.59.08l-1.68-.94-.21.11a6.1,6.1,0,0,1-1.08.47l-.23.07-.53,1.85A.51.51,0,0,1,10.91,19Z"
                                        ></path>
                                        <path
                                          className="tool-light"
                                          d="M9.47,18h1.06L11,16.26a.5.5,0,0,1,.32-.34l.48-.15a7,7,0,0,0,.93-.4l.45-.24a.51.51,0,0,1,.48,0l1.58.89.75-.75-.87-1.59a.47.47,0,0,1,0-.47l.23-.45a6.14,6.14,0,0,0,.39-.93l.15-.48a.5.5,0,0,1,.34-.32L18,10.53V9.45L16.25,9a.49.49,0,0,1-.34-.33l-.15-.47a6.8,6.8,0,0,0-.38-.93l-.23-.46a.47.47,0,0,1,0-.47L16,4.71,15.28,4l-1.58.88a.48.48,0,0,1-.48,0l-.45-.23a6.06,6.06,0,0,0-.93-.41l-.48-.15A.5.5,0,0,1,11,3.72L10.54,2H9.46L9,3.72a.5.5,0,0,1-.32.34l-.48.15a6.06,6.06,0,0,0-.93.41l-.45.23a.48.48,0,0,1-.48,0L4.72,4,4,4.71l.89,1.58a.51.51,0,0,1,0,.48l-.23.45a6.8,6.8,0,0,0-.38.93l-.15.47A.49.49,0,0,1,3.75,9L2,9.45v1.08L3.74,11a.5.5,0,0,1,.34.32l.15.48a5.74,5.74,0,0,0,.39.93l.23.45a.47.47,0,0,1,0,.47L4,15.28l.75.75,1.58-.89a.51.51,0,0,1,.48,0l.45.24a7,7,0,0,0,.93.4l.48.15a.5.5,0,0,1,.32.34Z"
                                        ></path>
                                        <path
                                          className="tool-dark"
                                          d="M10.05,12.83a2.74,2.74,0,1,1,2.74-2.74A2.74,2.74,0,0,1,10.05,12.83Z"
                                        ></path>
                                        <path
                                          className="tool-white"
                                          d="M10.05,8.36a1.74,1.74,0,1,0,1.74,1.73A1.74,1.74,0,0,0,10.05,8.36Z"
                                        ></path>
                                      </svg>
                                    </span>
                                  </button>
                                  <ul className="dropdown-menu modern_menu dropdown-menu-right hidden">
                                    <li className="disabled bg-warning">
                                      <a href="#" className="i space-normal">
                                        Please log in or create an account to
                                        use the default settings feature.{" "}
                                      </a>
                                    </li>
                                    <li
                                      role="separator"
                                      className="divider"
                                    ></li>
                                    <li className="CmApp-StickySettings-set disabled">
                                      <a className="SettingsGroups-Crop-Dpi-setStickyToCurrent disabled">
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          viewBox="0 0 15 15"
                                        >
                                          <path
                                            className="tool-dark"
                                            d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                          ></path>
                                          <path
                                            className="tool-light"
                                            d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                          ></path>
                                        </svg>
                                        <span className="CmApp-StickySettings-enabled">
                                          Set as new default
                                        </span>
                                        <span className="CmApp-StickySettings-disabled">
                                          Using Default
                                        </span>
                                      </a>
                                    </li>

                                    <li className="CmApp-StickySettings-reset disabled">
                                      <a className="SettingsGroups-Crop-Dpi-setCurrentToDefault disabled">
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          viewBox="0 0 15 15"
                                        >
                                          <circle
                                            className="tool-light"
                                            cx="8.5"
                                            cy="7.5"
                                            r="1.5"
                                          ></circle>
                                          <path
                                            className="tool-dark"
                                            d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                          ></path>
                                        </svg>
                                        <span>Reset to default</span>
                                      </a>
                                    </li>
                                    <li
                                      role="separator"
                                      className="divider"
                                    ></li>
                                    <li className="CmApp-StickySettings-factory disabled">
                                      <a className="SettingsGroups-Crop-Dpi-setCurrentAndStickyToFactory disabled">
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          viewBox="0 0 15 15"
                                        >
                                          <path
                                            className="tool-dark"
                                            d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                          ></path>
                                          <circle
                                            className="tool-light"
                                            cx="8.53"
                                            cy="7.5"
                                            r="1.5"
                                          ></circle>
                                        </svg>
                                        <span>Restore factory default</span>
                                      </a>
                                    </li>
                                    <li
                                      role="separator"
                                      className="divider"
                                    ></li>
                                    <li className="">
                                      <a className="sticky_settings">
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          viewBox="0 0 15 15"
                                        >
                                          <rect
                                            className="tool-dark"
                                            x="5.83"
                                            y="2.87"
                                            width="7.99"
                                            height="1.33"
                                            transform="translate(19.66 7.08) rotate(180)"
                                          ></rect>
                                          <rect
                                            className="tool-dark"
                                            x="5.83"
                                            y="6.87"
                                            width="7.99"
                                            height="1.33"
                                            transform="translate(19.66 15.07) rotate(180)"
                                          ></rect>
                                          <rect
                                            className="tool-dark"
                                            x="5.83"
                                            y="10.87"
                                            width="7.99"
                                            height="1.33"
                                            transform="translate(19.66 23.07) rotate(180)"
                                          ></rect>
                                          <circle
                                            className="tool-light"
                                            cx="2.47"
                                            cy="7.5"
                                            r="1.33"
                                          ></circle>
                                          <circle
                                            className="tool-light"
                                            cx="2.47"
                                            cy="3.48"
                                            r="1.33"
                                          ></circle>
                                          <circle
                                            className="tool-light"
                                            cx="2.47"
                                            cy="11.53"
                                            r="1.33"
                                          ></circle>
                                        </svg>
                                        <span>Show all defaults</span>
                                      </a>
                                    </li>
                                  </ul>
                                </div>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td colSpan="3" className="comment">
                                <div className="ExportOptions-NoColorSpaceOrDpiInOptimizedOutput-commentRow ExportOptions-NoColorSpaceOrDpiInOptimizedOutput-Dpi-comment ExportOptions-NoColorSpaceOrDpiInOptimizedOutput-comment ExportOptions-NoColorSpaceOrDpiInOptimizedOutput-emphasize">
                                  Web-optimized output does not contain DPI
                                  information.
                                </div>
                              </td>
                            </tr>
                            <tr className="Table-no_border">
                              <td> </td>
                              <td>Opaque File Format:</td>
                              <td>
                                <div
                                  className="ExportOptions-OpaqueFormat-group app_radio_button_group"
                                  data-toggle="buttons"
                                >
                                  <label className="ExportOptions-OpaqueFormat-jpg app_radio_buttons active">
                                    <input
                                      type="radio"
                                      value="ExportOptions-OpaqueFormat-jpg"
                                      name="ExportOptions-OpaqueFormat-group"
                                      autoComplete="off"
                                    />
                                    JPEG
                                  </label>
                                  <label className="ExportOptions-OpaqueFormat-png app_radio_buttons">
                                    <input
                                      type="radio"
                                      value="ExportOptions-OpaqueFormat-png"
                                      name="ExportOptions-OpaqueFormat-group"
                                      autoComplete="off"
                                    />
                                    PNG
                                  </label>
                                </div>
                              </td>
                              <td>
                                <div className="dropdown">
                                  <button
                                    aria-expanded="false"
                                    type="button"
                                    aria-haspopup="true"
                                    className="CmApp-Tools-tool dropdown-toggle CmApp-Tools-sticky_settings_button SettingsGroups-ExportOptions-OpaqueFileFormat-button btn-xs"
                                    data-toggle="dropdown"
                                  >
                                    <span>
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          className="tool-dark"
                                          d="M10.91,19H9.09a.5.5,0,0,1-.48-.36l-.53-1.85-.23-.07a6.1,6.1,0,0,1-1.08-.47l-.21-.11-1.68.94A.47.47,0,0,1,4.29,17L3,15.72a.51.51,0,0,1-.08-.6l.93-1.68-.11-.21a7.07,7.07,0,0,1-.45-1.08l-.07-.23-1.85-.53A.5.5,0,0,1,1,10.91V9.07a.5.5,0,0,1,.36-.48l1.86-.53.07-.22a6.69,6.69,0,0,1,.44-1.08l.11-.22L2.9,4.87A.51.51,0,0,1,3,4.27L4.29,3a.5.5,0,0,1,.59-.08l1.68.94.21-.11a8.06,8.06,0,0,1,1.08-.47l.23-.07.53-1.83A.5.5,0,0,1,9.09,1h1.82a.5.5,0,0,1,.48.36l.53,1.83.23.07a8.06,8.06,0,0,1,1.08.47l.21.11,1.68-.94a.48.48,0,0,1,.59.08L17,4.27a.51.51,0,0,1,.09.6l-.94,1.67.11.22a6.69,6.69,0,0,1,.44,1.08l.07.22,1.86.53a.5.5,0,0,1,.36.48v1.84a.5.5,0,0,1-.36.48l-1.85.53-.07.23a7.07,7.07,0,0,1-.45,1.08l-.11.21.93,1.68a.51.51,0,0,1-.08.6L15.71,17a.47.47,0,0,1-.59.08l-1.68-.94-.21.11a6.1,6.1,0,0,1-1.08.47l-.23.07-.53,1.85A.51.51,0,0,1,10.91,19Z"
                                        ></path>
                                        <path
                                          className="tool-light"
                                          d="M9.47,18h1.06L11,16.26a.5.5,0,0,1,.32-.34l.48-.15a7,7,0,0,0,.93-.4l.45-.24a.51.51,0,0,1,.48,0l1.58.89.75-.75-.87-1.59a.47.47,0,0,1,0-.47l.23-.45a6.14,6.14,0,0,0,.39-.93l.15-.48a.5.5,0,0,1,.34-.32L18,10.53V9.45L16.25,9a.49.49,0,0,1-.34-.33l-.15-.47a6.8,6.8,0,0,0-.38-.93l-.23-.46a.47.47,0,0,1,0-.47L16,4.71,15.28,4l-1.58.88a.48.48,0,0,1-.48,0l-.45-.23a6.06,6.06,0,0,0-.93-.41l-.48-.15A.5.5,0,0,1,11,3.72L10.54,2H9.46L9,3.72a.5.5,0,0,1-.32.34l-.48.15a6.06,6.06,0,0,0-.93.41l-.45.23a.48.48,0,0,1-.48,0L4.72,4,4,4.71l.89,1.58a.51.51,0,0,1,0,.48l-.23.45a6.8,6.8,0,0,0-.38.93l-.15.47A.49.49,0,0,1,3.75,9L2,9.45v1.08L3.74,11a.5.5,0,0,1,.34.32l.15.48a5.74,5.74,0,0,0,.39.93l.23.45a.47.47,0,0,1,0,.47L4,15.28l.75.75,1.58-.89a.51.51,0,0,1,.48,0l.45.24a7,7,0,0,0,.93.4l.48.15a.5.5,0,0,1,.32.34Z"
                                        ></path>
                                        <path
                                          className="tool-dark"
                                          d="M10.05,12.83a2.74,2.74,0,1,1,2.74-2.74A2.74,2.74,0,0,1,10.05,12.83Z"
                                        ></path>
                                        <path
                                          className="tool-white"
                                          d="M10.05,8.36a1.74,1.74,0,1,0,1.74,1.73A1.74,1.74,0,0,0,10.05,8.36Z"
                                        ></path>
                                      </svg>
                                    </span>
                                  </button>
                                  <ul className="dropdown-menu modern_menu dropdown-menu-right hidden">
                                    <li className="disabled bg-warning">
                                      <a href="#" className="i space-normal">
                                        Please log in or create an account to
                                        use the default settings feature.{" "}
                                      </a>
                                    </li>
                                    <li
                                      role="separator"
                                      className="divider"
                                    ></li>
                                    <li className="CmApp-StickySettings-set disabled">
                                      <a className="SettingsGroups-ExportOptions-OpaqueFileFormat-setStickyToCurrent disabled">
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          viewBox="0 0 15 15"
                                        >
                                          <path
                                            className="tool-dark"
                                            d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                          ></path>
                                          <path
                                            className="tool-light"
                                            d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                          ></path>
                                        </svg>
                                        <span className="CmApp-StickySettings-enabled">
                                          Set as new default
                                        </span>
                                        <span className="CmApp-StickySettings-disabled">
                                          Using Default
                                        </span>
                                      </a>
                                    </li>

                                    <li className="CmApp-StickySettings-reset disabled">
                                      <a className="SettingsGroups-ExportOptions-OpaqueFileFormat-setCurrentToDefault disabled">
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          viewBox="0 0 15 15"
                                        >
                                          <circle
                                            className="tool-light"
                                            cx="8.5"
                                            cy="7.5"
                                            r="1.5"
                                          ></circle>
                                          <path
                                            className="tool-dark"
                                            d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                          ></path>
                                        </svg>
                                        <span>Reset to default</span>
                                      </a>
                                    </li>
                                    <li
                                      role="separator"
                                      className="divider"
                                    ></li>
                                    <li className="CmApp-StickySettings-factory disabled">
                                      <a className="SettingsGroups-ExportOptions-OpaqueFileFormat-setCurrentAndStickyToFactory disabled">
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          viewBox="0 0 15 15"
                                        >
                                          <path
                                            className="tool-dark"
                                            d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                          ></path>
                                          <circle
                                            className="tool-light"
                                            cx="8.53"
                                            cy="7.5"
                                            r="1.5"
                                          ></circle>
                                        </svg>
                                        <span>Restore factory default</span>
                                      </a>
                                    </li>
                                    <li
                                      role="separator"
                                      className="divider"
                                    ></li>
                                    <li className="">
                                      <a className="sticky_settings">
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          viewBox="0 0 15 15"
                                        >
                                          <rect
                                            className="tool-dark"
                                            x="5.83"
                                            y="2.87"
                                            width="7.99"
                                            height="1.33"
                                            transform="translate(19.66 7.08) rotate(180)"
                                          ></rect>
                                          <rect
                                            className="tool-dark"
                                            x="5.83"
                                            y="6.87"
                                            width="7.99"
                                            height="1.33"
                                            transform="translate(19.66 15.07) rotate(180)"
                                          ></rect>
                                          <rect
                                            className="tool-dark"
                                            x="5.83"
                                            y="10.87"
                                            width="7.99"
                                            height="1.33"
                                            transform="translate(19.66 23.07) rotate(180)"
                                          ></rect>
                                          <circle
                                            className="tool-light"
                                            cx="2.47"
                                            cy="7.5"
                                            r="1.33"
                                          ></circle>
                                          <circle
                                            className="tool-light"
                                            cx="2.47"
                                            cy="3.48"
                                            r="1.33"
                                          ></circle>
                                          <circle
                                            className="tool-light"
                                            cx="2.47"
                                            cy="11.53"
                                            r="1.33"
                                          ></circle>
                                        </svg>
                                        <span>Show all defaults</span>
                                      </a>
                                    </li>
                                  </ul>
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td></td>
                              <td colSpan="3" className="comment">
                                Results with a transparent background are always
                                saved as PNGs.
                              </td>
                            </tr>
                            <tr className="Table-no_border">
                              <td> </td>
                              <td>JPEG Quality:</td>
                              <td>
                                <div className="app_bttn_group dropdown">
                                  <button
                                    aria-expanded="false"
                                    type="button"
                                    aria-haspopup="true"
                                    className="app_bttn app_bttn_dark dropdown-toggle"
                                    data-toggle="dropdown"
                                  >
                                    <span className="ExportOptions-JpgQuality-display">
                                      75
                                    </span>
                                    <i className="Icons-down_carrot"></i>
                                    <ul className="dropdown-menu modern_menu hidden">
                                      <li className="">
                                        <a className="ExportOptions-JpgQualityPresets-preset25">
                                          <span>25 (very low)</span>
                                        </a>
                                      </li>

                                      <li className="">
                                        <a className="ExportOptions-JpgQualityPresets-preset50">
                                          <span>50 (low)</span>
                                        </a>
                                      </li>

                                      <li className="">
                                        <a className="ExportOptions-JpgQualityPresets-preset75">
                                          <span>75 (medium)</span>
                                        </a>
                                      </li>

                                      <li className="">
                                        <a className="ExportOptions-JpgQualityPresets-preset90">
                                          <span>90 (high)</span>
                                        </a>
                                      </li>

                                      <li className="">
                                        <a className="ExportOptions-JpgQualityPresets-preset100">
                                          <span>100 (highest)</span>
                                        </a>
                                      </li>
                                    </ul>
                                  </button>
                                </div>
                                <div className="app_bttn_group">
                                  <div className="inline-flex">
                                    <div className="app_bttn_group">
                                      <button
                                        title="Lower quality, smaller file size"
                                        className="app_bttn  app_bttn_dark ExportOptions-JpgQuality-decrease"
                                        alt="Lower quality, smaller file size"
                                        id="ExportOptions-JpgQuality-decrease"
                                      >
                                        <span>-</span>
                                      </button>
                                      <button
                                        title="Higher quality, larger file size"
                                        className="app_bttn  app_bttn_dark ExportOptions-JpgQuality-increase"
                                        alt="Higher quality, larger file size"
                                        id="ExportOptions-JpgQuality-increase"
                                      >
                                        <span>+</span>
                                      </button>
                                    </div>
                                    <div className="app_bttn_group">
                                      <button
                                        title="Reset"
                                        className="app_bttn  app_bttn_dark ExportOptions-JpgQuality-reset disabled"
                                        alt="Reset"
                                        id="ExportOptions-JpgQuality-reset"
                                      >
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          viewBox="0 0 20 20"
                                        >
                                          <path
                                            className="tool-dark"
                                            d="M11.13,5H4.59L6.74,2.85,6,2.15l-3,3a.5.5,0,0,0,0,.7l3,3,.71-.7L4.59,6h6.54A4.84,4.84,0,0,1,16,10.84v.32A4.84,4.84,0,0,1,11.13,16H3.88v1h7.25A5.85,5.85,0,0,0,17,11.16v-.32A5.85,5.85,0,0,0,11.13,5Z"
                                          ></path>
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="dropup">
                                  <div className="dropdown">
                                    <button
                                      aria-expanded="false"
                                      type="button"
                                      aria-haspopup="true"
                                      className="CmApp-Tools-tool dropdown-toggle CmApp-Tools-sticky_settings_button SettingsGroups-ExportOptions-JpegQuality-button btn-xs"
                                      data-toggle="dropdown"
                                    >
                                      <span>
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          viewBox="0 0 20 20"
                                        >
                                          <path
                                            className="tool-dark"
                                            d="M10.91,19H9.09a.5.5,0,0,1-.48-.36l-.53-1.85-.23-.07a6.1,6.1,0,0,1-1.08-.47l-.21-.11-1.68.94A.47.47,0,0,1,4.29,17L3,15.72a.51.51,0,0,1-.08-.6l.93-1.68-.11-.21a7.07,7.07,0,0,1-.45-1.08l-.07-.23-1.85-.53A.5.5,0,0,1,1,10.91V9.07a.5.5,0,0,1,.36-.48l1.86-.53.07-.22a6.69,6.69,0,0,1,.44-1.08l.11-.22L2.9,4.87A.51.51,0,0,1,3,4.27L4.29,3a.5.5,0,0,1,.59-.08l1.68.94.21-.11a8.06,8.06,0,0,1,1.08-.47l.23-.07.53-1.83A.5.5,0,0,1,9.09,1h1.82a.5.5,0,0,1,.48.36l.53,1.83.23.07a8.06,8.06,0,0,1,1.08.47l.21.11,1.68-.94a.48.48,0,0,1,.59.08L17,4.27a.51.51,0,0,1,.09.6l-.94,1.67.11.22a6.69,6.69,0,0,1,.44,1.08l.07.22,1.86.53a.5.5,0,0,1,.36.48v1.84a.5.5,0,0,1-.36.48l-1.85.53-.07.23a7.07,7.07,0,0,1-.45,1.08l-.11.21.93,1.68a.51.51,0,0,1-.08.6L15.71,17a.47.47,0,0,1-.59.08l-1.68-.94-.21.11a6.1,6.1,0,0,1-1.08.47l-.23.07-.53,1.85A.51.51,0,0,1,10.91,19Z"
                                          ></path>
                                          <path
                                            className="tool-light"
                                            d="M9.47,18h1.06L11,16.26a.5.5,0,0,1,.32-.34l.48-.15a7,7,0,0,0,.93-.4l.45-.24a.51.51,0,0,1,.48,0l1.58.89.75-.75-.87-1.59a.47.47,0,0,1,0-.47l.23-.45a6.14,6.14,0,0,0,.39-.93l.15-.48a.5.5,0,0,1,.34-.32L18,10.53V9.45L16.25,9a.49.49,0,0,1-.34-.33l-.15-.47a6.8,6.8,0,0,0-.38-.93l-.23-.46a.47.47,0,0,1,0-.47L16,4.71,15.28,4l-1.58.88a.48.48,0,0,1-.48,0l-.45-.23a6.06,6.06,0,0,0-.93-.41l-.48-.15A.5.5,0,0,1,11,3.72L10.54,2H9.46L9,3.72a.5.5,0,0,1-.32.34l-.48.15a6.06,6.06,0,0,0-.93.41l-.45.23a.48.48,0,0,1-.48,0L4.72,4,4,4.71l.89,1.58a.51.51,0,0,1,0,.48l-.23.45a6.8,6.8,0,0,0-.38.93l-.15.47A.49.49,0,0,1,3.75,9L2,9.45v1.08L3.74,11a.5.5,0,0,1,.34.32l.15.48a5.74,5.74,0,0,0,.39.93l.23.45a.47.47,0,0,1,0,.47L4,15.28l.75.75,1.58-.89a.51.51,0,0,1,.48,0l.45.24a7,7,0,0,0,.93.4l.48.15a.5.5,0,0,1,.32.34Z"
                                          ></path>
                                          <path
                                            className="tool-dark"
                                            d="M10.05,12.83a2.74,2.74,0,1,1,2.74-2.74A2.74,2.74,0,0,1,10.05,12.83Z"
                                          ></path>
                                          <path
                                            className="tool-white"
                                            d="M10.05,8.36a1.74,1.74,0,1,0,1.74,1.73A1.74,1.74,0,0,0,10.05,8.36Z"
                                          ></path>
                                        </svg>
                                      </span>
                                    </button>
                                    <ul className="dropdown-menu modern_menu dropdown-menu-right hidden">
                                      <li className="disabled bg-warning">
                                        <a href="#" className="i space-normal">
                                          Please log in or create an account to
                                          use the default settings feature.{" "}
                                        </a>
                                      </li>
                                      <li
                                        role="separator"
                                        className="divider"
                                      ></li>
                                      <li className="CmApp-StickySettings-set disabled">
                                        <a className="SettingsGroups-ExportOptions-JpegQuality-setStickyToCurrent disabled">
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 15 15"
                                          >
                                            <path
                                              className="tool-dark"
                                              d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                            ></path>
                                            <path
                                              className="tool-light"
                                              d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                            ></path>
                                          </svg>
                                          <span className="CmApp-StickySettings-enabled">
                                            Set as new default
                                          </span>
                                          <span className="CmApp-StickySettings-disabled">
                                            Using Default
                                          </span>
                                        </a>
                                      </li>

                                      <li className="CmApp-StickySettings-reset disabled">
                                        <a className="SettingsGroups-ExportOptions-JpegQuality-setCurrentToDefault disabled">
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 15 15"
                                          >
                                            <circle
                                              className="tool-light"
                                              cx="8.5"
                                              cy="7.5"
                                              r="1.5"
                                            ></circle>
                                            <path
                                              className="tool-dark"
                                              d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                            ></path>
                                          </svg>
                                          <span>Reset to default</span>
                                        </a>
                                      </li>
                                      <li
                                        role="separator"
                                        className="divider"
                                      ></li>
                                      <li className="CmApp-StickySettings-factory disabled">
                                        <a className="SettingsGroups-ExportOptions-JpegQuality-setCurrentAndStickyToFactory disabled">
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 15 15"
                                          >
                                            <path
                                              className="tool-dark"
                                              d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                            ></path>
                                            <circle
                                              className="tool-light"
                                              cx="8.53"
                                              cy="7.5"
                                              r="1.5"
                                            ></circle>
                                          </svg>
                                          <span>Restore factory default</span>
                                        </a>
                                      </li>
                                      <li
                                        role="separator"
                                        className="divider"
                                      ></li>
                                      <li className="">
                                        <a className="sticky_settings">
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 15 15"
                                          >
                                            <rect
                                              className="tool-dark"
                                              x="5.83"
                                              y="2.87"
                                              width="7.99"
                                              height="1.33"
                                              transform="translate(19.66 7.08) rotate(180)"
                                            ></rect>
                                            <rect
                                              className="tool-dark"
                                              x="5.83"
                                              y="6.87"
                                              width="7.99"
                                              height="1.33"
                                              transform="translate(19.66 15.07) rotate(180)"
                                            ></rect>
                                            <rect
                                              className="tool-dark"
                                              x="5.83"
                                              y="10.87"
                                              width="7.99"
                                              height="1.33"
                                              transform="translate(19.66 23.07) rotate(180)"
                                            ></rect>
                                            <circle
                                              className="tool-light"
                                              cx="2.47"
                                              cy="7.5"
                                              r="1.33"
                                            ></circle>
                                            <circle
                                              className="tool-light"
                                              cx="2.47"
                                              cy="3.48"
                                              r="1.33"
                                            ></circle>
                                            <circle
                                              className="tool-light"
                                              cx="2.47"
                                              cy="11.53"
                                              r="1.33"
                                            ></circle>
                                          </svg>
                                          <span>Show all defaults</span>
                                        </a>
                                      </li>
                                    </ul>
                                  </div>
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td></td>
                              <td colSpan="2" className="comment">
                                A higher JPEG quality means better image
                                quality, but a larger file size.{" "}
                              </td>
                            </tr>
                          </tbody>
                          <thead>
                            <tr>
                              <th> </th>
                              <th colSpan="3">
                                <h4 className="pt-20">Web Optimized Output</h4>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="Table-no_border">
                              <td> </td>
                              <td>JPEG Optimization:</td>
                              <td>
                                <div
                                  className="ExportOptions-PngOptimization-group app_radio_button_group"
                                  data-toggle="buttons"
                                >
                                  <label className="ExportOptions-JpegOptimization-none app_radio_buttons">
                                    <input
                                      type="radio"
                                      value="ExportOptions-JpegOptimization-none"
                                      name="ExportOptions-PngOptimization-group"
                                      autoComplete="off"
                                    />
                                    None
                                  </label>
                                  <label className="ExportOptions-JpegOptimization-moz app_radio_buttons active">
                                    <input
                                      type="radio"
                                      value="ExportOptions-JpegOptimization-moz"
                                      name="ExportOptions-PngOptimization-group"
                                      autoComplete="off"
                                    />
                                    Enabled
                                  </label>
                                </div>
                              </td>
                              <td>
                                <div className="dropup">
                                  <div className="dropdown">
                                    <button
                                      aria-expanded="false"
                                      type="button"
                                      aria-haspopup="true"
                                      className="CmApp-Tools-tool dropdown-toggle CmApp-Tools-sticky_settings_button SettingsGroups-ExportOptions-JpegMode-button btn-xs"
                                      data-toggle="dropdown"
                                    >
                                      <span>
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          viewBox="0 0 20 20"
                                        >
                                          <path
                                            className="tool-dark"
                                            d="M10.91,19H9.09a.5.5,0,0,1-.48-.36l-.53-1.85-.23-.07a6.1,6.1,0,0,1-1.08-.47l-.21-.11-1.68.94A.47.47,0,0,1,4.29,17L3,15.72a.51.51,0,0,1-.08-.6l.93-1.68-.11-.21a7.07,7.07,0,0,1-.45-1.08l-.07-.23-1.85-.53A.5.5,0,0,1,1,10.91V9.07a.5.5,0,0,1,.36-.48l1.86-.53.07-.22a6.69,6.69,0,0,1,.44-1.08l.11-.22L2.9,4.87A.51.51,0,0,1,3,4.27L4.29,3a.5.5,0,0,1,.59-.08l1.68.94.21-.11a8.06,8.06,0,0,1,1.08-.47l.23-.07.53-1.83A.5.5,0,0,1,9.09,1h1.82a.5.5,0,0,1,.48.36l.53,1.83.23.07a8.06,8.06,0,0,1,1.08.47l.21.11,1.68-.94a.48.48,0,0,1,.59.08L17,4.27a.51.51,0,0,1,.09.6l-.94,1.67.11.22a6.69,6.69,0,0,1,.44,1.08l.07.22,1.86.53a.5.5,0,0,1,.36.48v1.84a.5.5,0,0,1-.36.48l-1.85.53-.07.23a7.07,7.07,0,0,1-.45,1.08l-.11.21.93,1.68a.51.51,0,0,1-.08.6L15.71,17a.47.47,0,0,1-.59.08l-1.68-.94-.21.11a6.1,6.1,0,0,1-1.08.47l-.23.07-.53,1.85A.51.51,0,0,1,10.91,19Z"
                                          ></path>
                                          <path
                                            className="tool-light"
                                            d="M9.47,18h1.06L11,16.26a.5.5,0,0,1,.32-.34l.48-.15a7,7,0,0,0,.93-.4l.45-.24a.51.51,0,0,1,.48,0l1.58.89.75-.75-.87-1.59a.47.47,0,0,1,0-.47l.23-.45a6.14,6.14,0,0,0,.39-.93l.15-.48a.5.5,0,0,1,.34-.32L18,10.53V9.45L16.25,9a.49.49,0,0,1-.34-.33l-.15-.47a6.8,6.8,0,0,0-.38-.93l-.23-.46a.47.47,0,0,1,0-.47L16,4.71,15.28,4l-1.58.88a.48.48,0,0,1-.48,0l-.45-.23a6.06,6.06,0,0,0-.93-.41l-.48-.15A.5.5,0,0,1,11,3.72L10.54,2H9.46L9,3.72a.5.5,0,0,1-.32.34l-.48.15a6.06,6.06,0,0,0-.93.41l-.45.23a.48.48,0,0,1-.48,0L4.72,4,4,4.71l.89,1.58a.51.51,0,0,1,0,.48l-.23.45a6.8,6.8,0,0,0-.38.93l-.15.47A.49.49,0,0,1,3.75,9L2,9.45v1.08L3.74,11a.5.5,0,0,1,.34.32l.15.48a5.74,5.74,0,0,0,.39.93l.23.45a.47.47,0,0,1,0,.47L4,15.28l.75.75,1.58-.89a.51.51,0,0,1,.48,0l.45.24a7,7,0,0,0,.93.4l.48.15a.5.5,0,0,1,.32.34Z"
                                          ></path>
                                          <path
                                            className="tool-dark"
                                            d="M10.05,12.83a2.74,2.74,0,1,1,2.74-2.74A2.74,2.74,0,0,1,10.05,12.83Z"
                                          ></path>
                                          <path
                                            className="tool-white"
                                            d="M10.05,8.36a1.74,1.74,0,1,0,1.74,1.73A1.74,1.74,0,0,0,10.05,8.36Z"
                                          ></path>
                                        </svg>
                                      </span>
                                    </button>
                                    <ul className="dropdown-menu modern_menu dropdown-menu-right hidden">
                                      <li className="disabled bg-warning">
                                        <a href="#" className="i space-normal">
                                          Please log in or create an account to
                                          use the default settings feature.{" "}
                                        </a>
                                      </li>
                                      <li
                                        role="separator"
                                        className="divider"
                                      ></li>
                                      <li className="CmApp-StickySettings-set disabled">
                                        <a className="SettingsGroups-ExportOptions-JpegMode-setStickyToCurrent disabled">
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 15 15"
                                          >
                                            <path
                                              className="tool-dark"
                                              d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                            ></path>
                                            <path
                                              className="tool-light"
                                              d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                            ></path>
                                          </svg>
                                          <span className="CmApp-StickySettings-enabled">
                                            Set as new default
                                          </span>
                                          <span className="CmApp-StickySettings-disabled">
                                            Using Default
                                          </span>
                                        </a>
                                      </li>

                                      <li className="CmApp-StickySettings-reset disabled">
                                        <a className="SettingsGroups-ExportOptions-JpegMode-setCurrentToDefault disabled">
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 15 15"
                                          >
                                            <circle
                                              className="tool-light"
                                              cx="8.5"
                                              cy="7.5"
                                              r="1.5"
                                            ></circle>
                                            <path
                                              className="tool-dark"
                                              d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                            ></path>
                                          </svg>
                                          <span>Reset to default</span>
                                        </a>
                                      </li>
                                      <li
                                        role="separator"
                                        className="divider"
                                      ></li>
                                      <li className="CmApp-StickySettings-factory disabled">
                                        <a className="SettingsGroups-ExportOptions-JpegMode-setCurrentAndStickyToFactory disabled">
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 15 15"
                                          >
                                            <path
                                              className="tool-dark"
                                              d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                            ></path>
                                            <circle
                                              className="tool-light"
                                              cx="8.53"
                                              cy="7.5"
                                              r="1.5"
                                            ></circle>
                                          </svg>
                                          <span>Restore factory default</span>
                                        </a>
                                      </li>
                                      <li
                                        role="separator"
                                        className="divider"
                                      ></li>
                                      <li className="">
                                        <a className="sticky_settings">
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 15 15"
                                          >
                                            <rect
                                              className="tool-dark"
                                              x="5.83"
                                              y="2.87"
                                              width="7.99"
                                              height="1.33"
                                              transform="translate(19.66 7.08) rotate(180)"
                                            ></rect>
                                            <rect
                                              className="tool-dark"
                                              x="5.83"
                                              y="6.87"
                                              width="7.99"
                                              height="1.33"
                                              transform="translate(19.66 15.07) rotate(180)"
                                            ></rect>
                                            <rect
                                              className="tool-dark"
                                              x="5.83"
                                              y="10.87"
                                              width="7.99"
                                              height="1.33"
                                              transform="translate(19.66 23.07) rotate(180)"
                                            ></rect>
                                            <circle
                                              className="tool-light"
                                              cx="2.47"
                                              cy="7.5"
                                              r="1.33"
                                            ></circle>
                                            <circle
                                              className="tool-light"
                                              cx="2.47"
                                              cy="3.48"
                                              r="1.33"
                                            ></circle>
                                            <circle
                                              className="tool-light"
                                              cx="2.47"
                                              cy="11.53"
                                              r="1.33"
                                            ></circle>
                                          </svg>
                                          <span>Show all defaults</span>
                                        </a>
                                      </li>
                                    </ul>
                                  </div>
                                </div>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td colSpan="3" className="comment">
                                <div className="ExportOptions-NoColorSpaceOrDpiInOptimizedOutput-commentRow ExportOptions-NoColorSpaceOrDpiInOptimizedOutput-Jpeg-comment ExportOptions-NoColorSpaceOrDpiInOptimizedOutput-comment ExportOptions-NoColorSpaceOrDpiInOptimizedOutput-emphasize">
                                  To minimize file size, web-optimized output
                                  does not contain color space or DPI
                                  information.
                                </div>
                              </td>
                            </tr>
                            <tr className="Table-no_border">
                              <td> </td>
                              <td>PNG Optimization:</td>
                              <td>
                                <div
                                  className="ExportOptions-PngOptimization-group app_radio_button_group"
                                  data-toggle="buttons"
                                >
                                  <label className="ExportOptions-PngOptimization-none app_radio_buttons">
                                    <input
                                      type="radio"
                                      value="ExportOptions-PngOptimization-none"
                                      name="ExportOptions-PngOptimization-group"
                                      autoComplete="off"
                                    />
                                    None
                                  </label>
                                  <label className="ExportOptions-PngOptimization-lossless app_radio_buttons active">
                                    <input
                                      type="radio"
                                      value="ExportOptions-PngOptimization-lossless"
                                      name="ExportOptions-PngOptimization-group"
                                      autoComplete="off"
                                    />
                                    Lossless
                                  </label>
                                  <label className="ExportOptions-PngOptimization-lossy app_radio_buttons">
                                    <input
                                      type="radio"
                                      value="ExportOptions-PngOptimization-lossy"
                                      name="ExportOptions-PngOptimization-group"
                                      autoComplete="off"
                                    />
                                    Lossy
                                  </label>
                                </div>
                              </td>
                              <td>
                                <div className="dropup">
                                  <div className="dropdown">
                                    <button
                                      aria-expanded="false"
                                      type="button"
                                      aria-haspopup="true"
                                      className="CmApp-Tools-tool dropdown-toggle CmApp-Tools-sticky_settings_button SettingsGroups-ExportOptions-PngMode-button btn-xs"
                                      data-toggle="dropdown"
                                    >
                                      <span>
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          viewBox="0 0 20 20"
                                        >
                                          <path
                                            className="tool-dark"
                                            d="M10.91,19H9.09a.5.5,0,0,1-.48-.36l-.53-1.85-.23-.07a6.1,6.1,0,0,1-1.08-.47l-.21-.11-1.68.94A.47.47,0,0,1,4.29,17L3,15.72a.51.51,0,0,1-.08-.6l.93-1.68-.11-.21a7.07,7.07,0,0,1-.45-1.08l-.07-.23-1.85-.53A.5.5,0,0,1,1,10.91V9.07a.5.5,0,0,1,.36-.48l1.86-.53.07-.22a6.69,6.69,0,0,1,.44-1.08l.11-.22L2.9,4.87A.51.51,0,0,1,3,4.27L4.29,3a.5.5,0,0,1,.59-.08l1.68.94.21-.11a8.06,8.06,0,0,1,1.08-.47l.23-.07.53-1.83A.5.5,0,0,1,9.09,1h1.82a.5.5,0,0,1,.48.36l.53,1.83.23.07a8.06,8.06,0,0,1,1.08.47l.21.11,1.68-.94a.48.48,0,0,1,.59.08L17,4.27a.51.51,0,0,1,.09.6l-.94,1.67.11.22a6.69,6.69,0,0,1,.44,1.08l.07.22,1.86.53a.5.5,0,0,1,.36.48v1.84a.5.5,0,0,1-.36.48l-1.85.53-.07.23a7.07,7.07,0,0,1-.45,1.08l-.11.21.93,1.68a.51.51,0,0,1-.08.6L15.71,17a.47.47,0,0,1-.59.08l-1.68-.94-.21.11a6.1,6.1,0,0,1-1.08.47l-.23.07-.53,1.85A.51.51,0,0,1,10.91,19Z"
                                          ></path>
                                          <path
                                            className="tool-light"
                                            d="M9.47,18h1.06L11,16.26a.5.5,0,0,1,.32-.34l.48-.15a7,7,0,0,0,.93-.4l.45-.24a.51.51,0,0,1,.48,0l1.58.89.75-.75-.87-1.59a.47.47,0,0,1,0-.47l.23-.45a6.14,6.14,0,0,0,.39-.93l.15-.48a.5.5,0,0,1,.34-.32L18,10.53V9.45L16.25,9a.49.49,0,0,1-.34-.33l-.15-.47a6.8,6.8,0,0,0-.38-.93l-.23-.46a.47.47,0,0,1,0-.47L16,4.71,15.28,4l-1.58.88a.48.48,0,0,1-.48,0l-.45-.23a6.06,6.06,0,0,0-.93-.41l-.48-.15A.5.5,0,0,1,11,3.72L10.54,2H9.46L9,3.72a.5.5,0,0,1-.32.34l-.48.15a6.06,6.06,0,0,0-.93.41l-.45.23a.48.48,0,0,1-.48,0L4.72,4,4,4.71l.89,1.58a.51.51,0,0,1,0,.48l-.23.45a6.8,6.8,0,0,0-.38.93l-.15.47A.49.49,0,0,1,3.75,9L2,9.45v1.08L3.74,11a.5.5,0,0,1,.34.32l.15.48a5.74,5.74,0,0,0,.39.93l.23.45a.47.47,0,0,1,0,.47L4,15.28l.75.75,1.58-.89a.51.51,0,0,1,.48,0l.45.24a7,7,0,0,0,.93.4l.48.15a.5.5,0,0,1,.32.34Z"
                                          ></path>
                                          <path
                                            className="tool-dark"
                                            d="M10.05,12.83a2.74,2.74,0,1,1,2.74-2.74A2.74,2.74,0,0,1,10.05,12.83Z"
                                          ></path>
                                          <path
                                            className="tool-white"
                                            d="M10.05,8.36a1.74,1.74,0,1,0,1.74,1.73A1.74,1.74,0,0,0,10.05,8.36Z"
                                          ></path>
                                        </svg>
                                      </span>
                                    </button>
                                    <ul className="dropdown-menu modern_menu dropdown-menu-right hidden">
                                      <li className="disabled bg-warning">
                                        <a href="#" className="i space-normal">
                                          Please log in or create an account to
                                          use the default settings feature.{" "}
                                        </a>
                                      </li>
                                      <li
                                        role="separator"
                                        className="divider"
                                      ></li>
                                      <li className="CmApp-StickySettings-set disabled">
                                        <a className="SettingsGroups-ExportOptions-PngMode-setStickyToCurrent disabled">
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 15 15"
                                          >
                                            <path
                                              className="tool-dark"
                                              d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                            ></path>
                                            <path
                                              className="tool-light"
                                              d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                            ></path>
                                          </svg>
                                          <span className="CmApp-StickySettings-enabled">
                                            Set as new default
                                          </span>
                                          <span className="CmApp-StickySettings-disabled">
                                            Using Default
                                          </span>
                                        </a>
                                      </li>

                                      <li className="CmApp-StickySettings-reset disabled">
                                        <a className="SettingsGroups-ExportOptions-PngMode-setCurrentToDefault disabled">
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 15 15"
                                          >
                                            <circle
                                              className="tool-light"
                                              cx="8.5"
                                              cy="7.5"
                                              r="1.5"
                                            ></circle>
                                            <path
                                              className="tool-dark"
                                              d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                            ></path>
                                          </svg>
                                          <span>Reset to default</span>
                                        </a>
                                      </li>
                                      <li
                                        role="separator"
                                        className="divider"
                                      ></li>
                                      <li className="CmApp-StickySettings-factory disabled">
                                        <a className="SettingsGroups-ExportOptions-PngMode-setCurrentAndStickyToFactory disabled">
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 15 15"
                                          >
                                            <path
                                              className="tool-dark"
                                              d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                            ></path>
                                            <circle
                                              className="tool-light"
                                              cx="8.53"
                                              cy="7.5"
                                              r="1.5"
                                            ></circle>
                                          </svg>
                                          <span>Restore factory default</span>
                                        </a>
                                      </li>
                                      <li
                                        role="separator"
                                        className="divider"
                                      ></li>
                                      <li className="">
                                        <a className="sticky_settings">
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 15 15"
                                          >
                                            <rect
                                              className="tool-dark"
                                              x="5.83"
                                              y="2.87"
                                              width="7.99"
                                              height="1.33"
                                              transform="translate(19.66 7.08) rotate(180)"
                                            ></rect>
                                            <rect
                                              className="tool-dark"
                                              x="5.83"
                                              y="6.87"
                                              width="7.99"
                                              height="1.33"
                                              transform="translate(19.66 15.07) rotate(180)"
                                            ></rect>
                                            <rect
                                              className="tool-dark"
                                              x="5.83"
                                              y="10.87"
                                              width="7.99"
                                              height="1.33"
                                              transform="translate(19.66 23.07) rotate(180)"
                                            ></rect>
                                            <circle
                                              className="tool-light"
                                              cx="2.47"
                                              cy="7.5"
                                              r="1.33"
                                            ></circle>
                                            <circle
                                              className="tool-light"
                                              cx="2.47"
                                              cy="3.48"
                                              r="1.33"
                                            ></circle>
                                            <circle
                                              className="tool-light"
                                              cx="2.47"
                                              cy="11.53"
                                              r="1.33"
                                            ></circle>
                                          </svg>
                                          <span>Show all defaults</span>
                                        </a>
                                      </li>
                                    </ul>
                                  </div>
                                </div>
                              </td>
                            </tr>

                            <tr>
                              <td></td>
                              <td colSpan="3" className="comment">
                                <div className="ExportOptions-NoColorSpaceOrDpiInOptimizedOutput-commentRow ExportOptions-NoColorSpaceOrDpiInOptimizedOutput-Png-comment ExportOptions-NoColorSpaceOrDpiInOptimizedOutput-comment ExportOptions-NoColorSpaceOrDpiInOptimizedOutput-emphasize">
                                  To minimize file size, web-optimized output
                                  does not contain color space or DPI
                                  information.
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="modal-footer Modal-footer">
                        <div className="app_bttn_group">
                          <button
                            title="Download Result"
                            className="app_bttn_large sticky_settings_close app_bttn  app_bttn_dark CmApp-Tools-download"
                            alt="Download Result"
                            id="CmApp-Tools-download"
                          >
                            <span>
                              <span className="lightState-progress hidden">
                                Uploading...
                              </span>
                              <span className="lightState-connecting hidden">
                                Connecting...
                              </span>
                              <span className="lightState-updating hidden">
                                Updating...
                              </span>
                              <span className="lightState-updated inline">
                                Download
                              </span>
                            </span>
                          </button>
                        </div>
                        <div className="app_bttn_group">
                          <button className="app_bttn app_bttn_large app_bttn_dark sticky_settings_close CmApp-SubApps-subAppCloseButton">
                            Ok
                          </button>
                        </div>
                      </div>
                    </div>
                  </Tab>
                </TabsControl>
              </div>
            </div>
          </div>
        ) : null}

        {this.state.colorsPopover ? (
          <div
            tabindex="-1"
            className="modal in block z-1041"
            id="subapp-lightbox"
          >
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-body CmApp-SubApps-body">
                  <div id="subapp">
                    <div className="allowSelect" id="subapp-sidebar">
                      <div
                        className="subapp_sidebar hidden"
                        id="clone-app-sidebar"
                      ></div>
                      <div className="CmApp-SubApps-top_toolbar">
                        <div className="CmApp-Bar-tool_group CmApp-Bar-tool_group_blue">
                          <button
                            title="Undo (Keyboard: Z)"
                            className="CmApp-Tools-tool CmApp-Tools-undo "
                            alt="Undo (Keyboard: Z)"
                            id="CmApp-Tools-undo"
                            disabled="disabled"
                          >
                            <span>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  className="tool-dark"
                                  d="M11.13,5H4.59L6.74,2.85,6,2.15l-3,3a.5.5,0,0,0,0,.7l3,3,.71-.7L4.59,6h6.54A4.84,4.84,0,0,1,16,10.84v.32A4.84,4.84,0,0,1,11.13,16H3.88v1h7.25A5.85,5.85,0,0,0,17,11.16v-.32A5.85,5.85,0,0,0,11.13,5Z"
                                ></path>
                              </svg>
                            </span>
                          </button>

                          <button
                            title="Redo (Keyboard: Y)"
                            className="CmApp-Tools-tool CmApp-Tools-redo "
                            alt="Redo (Keyboard: Y)"
                            id="CmApp-Tools-redo"
                            disabled="disabled"
                          >
                            <span>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  className="tool-dark"
                                  d="M13.94,8.85l3-3a.5.5,0,0,0,0-.7l-3-3-.71.7L15.38,5H8.84A5.85,5.85,0,0,0,3,10.84v.32A5.85,5.85,0,0,0,8.84,17h7.25V16H8.84A4.84,4.84,0,0,1,4,11.16v-.32A4.84,4.84,0,0,1,8.84,6h6.54L13.23,8.15Z"
                                ></path>
                              </svg>
                            </span>
                          </button>
                        </div>
                        <div className="CmApp-Bar-tool_group CmApp-Bar-tool_group_blue">
                          <button
                            title="Zoom In (Mouse Wheel)"
                            className="CmApp-Tools-tool CmApp-Tools-subapp_zoom_in "
                            alt="Zoom In (Mouse Wheel)"
                            id="CmApp-Tools-subapp_zoom_in"
                          >
                            <span>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  className="tool-dark"
                                  d="M18.74,17.55l-4.17-4.17a7.56,7.56,0,1,0-.7.71L18,18.26Z"
                                ></path>
                                <path
                                  className="tool-light"
                                  d="M8.88,2a6.5,6.5,0,1,1-6.5,6.5A6.51,6.51,0,0,1,8.88,2"
                                ></path>
                                <polygon
                                  className="tool-dark"
                                  points="11.88 8 9.38 8 9.38 5.5 8.38 5.5 8.38 8 5.88 8 5.88 9 8.38 9 8.38 11.5 9.38 11.5 9.38 9 11.88 9 11.88 8"
                                ></polygon>
                              </svg>
                            </span>
                          </button>

                          <button
                            title="Zoom Out (Mouse Wheel)"
                            className="CmApp-Tools-tool CmApp-Tools-subapp_zoom_out "
                            alt="Zoom Out (Mouse Wheel)"
                            id="CmApp-Tools-subapp_zoom_out"
                          >
                            <span>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  className="tool-dark"
                                  d="M18.35,17.55l-4.16-4.17A7.5,7.5,0,1,0,8.5,16a7.4,7.4,0,0,0,5-1.91l4.17,4.17Z"
                                ></path>
                                <path
                                  className="tool-light"
                                  d="M8.5,2A6.5,6.5,0,1,1,2,8.5,6.51,6.51,0,0,1,8.5,2"
                                ></path>
                                <rect
                                  className="tool-dark"
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
                            className="CmApp-Tools-tool CmApp-Tools-subapp_zoom_to_fit "
                            alt="Zoom to Fit (Keyboard: Home)"
                            id="CmApp-Tools-subapp_zoom_to_fit"
                          >
                            <span>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 25 20"
                              >
                                <path
                                  className="tool-dark"
                                  d="M1.88,2.37c0-.2.23-.37.49-.37H8.88V1H2.37A1.44,1.44,0,0,0,.88,2.37V8h1Z"
                                ></path>
                                <path
                                  className="tool-dark"
                                  d="M22.4,1H15.88V2H22.4a.44.44,0,0,1,.48.37V8h1V2.37A1.43,1.43,0,0,0,22.4,1Z"
                                ></path>
                                <path
                                  className="tool-dark"
                                  d="M22.88,17.63a.44.44,0,0,1-.48.37H15.88v1H22.4a1.43,1.43,0,0,0,1.48-1.37V12h-1Z"
                                ></path>
                                <path
                                  className="tool-dark"
                                  d="M11.76,10H2A1.07,1.07,0,0,0,.88,11v7A1.07,1.07,0,0,0,2,19h9.75a1.06,1.06,0,0,0,1.12-1V11A1.06,1.06,0,0,0,11.76,10Zm0,8H2c-.07,0-.12,0-.13,0V11A.22.22,0,0,1,2,11h9.75c.07,0,.12,0,.12,0l0,7A.22.22,0,0,1,11.76,18Z"
                                ></path>
                                <path
                                  className="tool-dark"
                                  d="M14,6.85l.71-.7-2-2a.5.5,0,0,0-.71,0l-2,2,.71.7,1.14-1.14V9h1V5.71Z"
                                ></path>
                                <path
                                  className="tool-dark"
                                  d="M16,12.15l.71.7,2-2a.5.5,0,0,0,0-.7l-2-2-.71.7L17.18,10h-3.3v1h3.3Z"
                                ></path>
                                <path
                                  className="tool-light"
                                  d="M2,11a.22.22,0,0,0-.14,0v7s.06,0,.13,0h9.75a.22.22,0,0,0,.14,0l0-7s-.05,0-.12,0Z"
                                ></path>
                              </svg>
                            </span>
                          </button>

                          <button
                            title="Download Result"
                            className="app_bttn  app_bttn_white CmApp-Tools-download"
                            alt="Download Result"
                            id="CmApp-Tools-download"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 6.34 7.99"
                            >
                              <path d="M5.84,8H.5a.5.5,0,0,1-.5-.5A.5.5,0,0,1,.5,7H5.84a.5.5,0,0,1,.5.5A.5.5,0,0,1,5.84,8Z"></path>
                              <path d="M5.53,3.33h0a.36.36,0,0,0-.52,0L3.7,4.63,3.53.37A.38.38,0,0,0,3.15,0h0a.38.38,0,0,0-.38.37L2.66,4.63l-1.3-1.3a.37.37,0,0,0-.53,0h0a.37.37,0,0,0,0,.52L2.78,5.79a.56.56,0,0,0,.81,0L5.53,3.85A.37.37,0,0,0,5.53,3.33Z"></path>
                            </svg>
                          </button>
                        </div>
                        <div className="CmApp-Bar-tool_group CmApp-Bar-tool_group_blue float-r border-0">
                          <button
                            title="Save and close"
                            className="CmApp-Tools-tool CmApp-Tools-save_exit_app CmApp-ShadowApp-close_button CmApp-CropApp-close_button CmApp-CropApp-close_button"
                            alt="Save and close"
                            id="CmApp-Tools-save_exit_app"
                            onClick={() => {
                              this.setState({
                                colorsPopover: false,
                              });
                            }}
                          >
                            <span>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 15 15"
                              >
                                <path
                                  className="tool-dark"
                                  d="M12.68,2.67l-8.2,8.14L1.92,8.13l-.72.69,2.91,3a.48.48,0,0,0,.35.16h0a.47.47,0,0,0,.35-.15l8.56-8.5Z"
                                ></path>
                              </svg>
                            </span>
                          </button>
                        </div>
                      </div>
                      <div
                        className="canvas-view noselect checkered_222 pan-tool"
                        id="subapp-view"
                      >
                        <canvas
                          width="1004"
                          height="312"
                          style={{
                            width: "1004px",
                            height: "312px",
                            left: "0px",
                          }}
                        ></canvas>
                      </div>

                      <SideTabsControl className="tab-content">
                        <SideTab
                          name="Colors"
                          img={
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                            >
                              <circle
                                class="tool-dark"
                                cx="10"
                                cy="10"
                                r="9"
                              ></circle>
                              <path
                                class="tool-white"
                                d="M9.51,18V2A8,8,0,0,0,2,10,8,8,0,0,0,9.51,18Z"
                              ></path>
                              <path
                                class="tool-light"
                                d="M10.51,2V18A7.93,7.93,0,0,0,18,10,8,8,0,0,0,10.51,2Z"
                              ></path>
                            </svg>
                          }
                        >
                          <div
                            className="subapp_sidebar"
                            id="CmApp-ColorsApp-Sidebar"
                          >
                            <div className="scrollable">
                              <div className="CmApp-ColorsApp-ColorLevels-container">
                                <div className="CmApp-SubApps-primary_sec">
                                  <div className="CmApp-SubApps-sec_header">
                                    <p className="h4">Color Adjustments</p>
                                  </div>
                                  <table className="table table-condensed CmApp-SubApps-table">
                                    <tbody>
                                      <tr className="CmApp-ColorsApp-ColorLevels-brightness-container CmApp-SubApps-unit_row">
                                        <td>
                                          <a
                                            target="tutorial"
                                            href="/tutorials/finishing-touches#colors"
                                          >
                                            Brightness
                                          </a>
                                          :
                                        </td>
                                        <td>
                                          <span className="CmApp-ColorsApp-ColorLevels-brightness-display">
                                            0
                                          </span>
                                        </td>
                                        <td>
                                          <div
                                            style={{ display: "inline-flex" }}
                                          >
                                            <div className="app_bttn_group">
                                              <button
                                                title="Darken"
                                                className="app_bttn  app_bttn_dark CmApp-ColorsApp-ColorLevels-brightness-decrease"
                                                alt="Darken"
                                                id="CmApp-ColorsApp-ColorLevels-brightness-decrease"
                                              >
                                                <span>-</span>
                                              </button>
                                              <button
                                                title="Lighten"
                                                className="app_bttn  app_bttn_dark CmApp-ColorsApp-ColorLevels-brightness-increase"
                                                alt="Lighten"
                                                id="CmApp-ColorsApp-ColorLevels-brightness-increase"
                                              >
                                                <span>+</span>
                                              </button>
                                            </div>
                                            <div className="app_bttn_group">
                                              <button
                                                title="Reset"
                                                className="disabled app_bttn  app_bttn_dark CmApp-ColorsApp-ColorLevels-brightness-reset"
                                                alt="Reset"
                                                id="CmApp-ColorsApp-ColorLevels-brightness-reset"
                                              >
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  viewBox="0 0 20 20"
                                                >
                                                  <path
                                                    className="tool-dark"
                                                    d="M11.13,5H4.59L6.74,2.85,6,2.15l-3,3a.5.5,0,0,0,0,.7l3,3,.71-.7L4.59,6h6.54A4.84,4.84,0,0,1,16,10.84v.32A4.84,4.84,0,0,1,11.13,16H3.88v1h7.25A5.85,5.85,0,0,0,17,11.16v-.32A5.85,5.85,0,0,0,11.13,5Z"
                                                  ></path>
                                                </svg>
                                              </button>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>

                                      <tr className="CmApp-ColorsApp-ColorLevels-shadows-container CmApp-SubApps-unit_row">
                                        <td>
                                          <a
                                            target="tutorial"
                                            href="/tutorials/finishing-touches#colors"
                                          >
                                            Shadows
                                          </a>
                                          :
                                        </td>
                                        <td>
                                          <span className="CmApp-ColorsApp-ColorLevels-shadows-display">
                                            0
                                          </span>
                                        </td>
                                        <td>
                                          <div
                                            style={{ display: "inline-flex" }}
                                          >
                                            <div className="app_bttn_group">
                                              <button
                                                title="Lighter Shadows"
                                                className="app_bttn  app_bttn_dark CmApp-ColorsApp-ColorLevels-shadows-decrease"
                                                alt="Lighter Shadows"
                                                id="CmApp-ColorsApp-ColorLevels-shadows-decrease"
                                              >
                                                <span>-</span>
                                              </button>
                                              <button
                                                title="Darker Shadows"
                                                className="app_bttn  app_bttn_dark CmApp-ColorsApp-ColorLevels-shadows-increase"
                                                alt="Darker Shadows"
                                                id="CmApp-ColorsApp-ColorLevels-shadows-increase"
                                              >
                                                <span>+</span>
                                              </button>
                                            </div>
                                            <div className="app_bttn_group">
                                              <button
                                                title="Reset"
                                                className="disabled app_bttn  app_bttn_dark CmApp-ColorsApp-ColorLevels-shadows-reset"
                                                alt="Reset"
                                                id="CmApp-ColorsApp-ColorLevels-shadows-reset"
                                              >
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  viewBox="0 0 20 20"
                                                >
                                                  <path
                                                    className="tool-dark"
                                                    d="M11.13,5H4.59L6.74,2.85,6,2.15l-3,3a.5.5,0,0,0,0,.7l3,3,.71-.7L4.59,6h6.54A4.84,4.84,0,0,1,16,10.84v.32A4.84,4.84,0,0,1,11.13,16H3.88v1h7.25A5.85,5.85,0,0,0,17,11.16v-.32A5.85,5.85,0,0,0,11.13,5Z"
                                                  ></path>
                                                </svg>
                                              </button>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>

                                      <tr className="CmApp-ColorsApp-ColorLevels-highlights-container CmApp-SubApps-unit_row">
                                        <td>
                                          <a
                                            target="tutorial"
                                            href="/tutorials/finishing-touches#colors"
                                          >
                                            Highlights
                                          </a>
                                          :
                                        </td>
                                        <td>
                                          <span className="CmApp-ColorsApp-ColorLevels-highlights-display">
                                            0
                                          </span>
                                        </td>
                                        <td>
                                          <div
                                            style={{ display: "inline-flex" }}
                                          >
                                            <div className="app_bttn_group">
                                              <button
                                                title="Darker Highlights"
                                                className="app_bttn  app_bttn_dark CmApp-ColorsApp-ColorLevels-highlights-decrease"
                                                alt="Darker Highlights"
                                                id="CmApp-ColorsApp-ColorLevels-highlights-decrease"
                                              >
                                                <span>-</span>
                                              </button>
                                              <button
                                                title="Lighter Highlights"
                                                className="app_bttn  app_bttn_dark CmApp-ColorsApp-ColorLevels-highlights-increase"
                                                alt="Lighter Highlights"
                                                id="CmApp-ColorsApp-ColorLevels-highlights-increase"
                                              >
                                                <span>+</span>
                                              </button>
                                            </div>
                                            <div className="app_bttn_group">
                                              <button
                                                title="Reset"
                                                className="disabled app_bttn  app_bttn_dark CmApp-ColorsApp-ColorLevels-highlights-reset"
                                                alt="Reset"
                                                id="CmApp-ColorsApp-ColorLevels-highlights-reset"
                                              >
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  viewBox="0 0 20 20"
                                                >
                                                  <path
                                                    className="tool-dark"
                                                    d="M11.13,5H4.59L6.74,2.85,6,2.15l-3,3a.5.5,0,0,0,0,.7l3,3,.71-.7L4.59,6h6.54A4.84,4.84,0,0,1,16,10.84v.32A4.84,4.84,0,0,1,11.13,16H3.88v1h7.25A5.85,5.85,0,0,0,17,11.16v-.32A5.85,5.85,0,0,0,11.13,5Z"
                                                  ></path>
                                                </svg>
                                              </button>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>

                                      <tr className="CmApp-ColorsApp-ColorLevels-temperature-container CmApp-SubApps-unit_row">
                                        <td>
                                          <a
                                            target="tutorial"
                                            href="/tutorials/finishing-touches#colors"
                                          >
                                            Temperature
                                          </a>
                                          :
                                        </td>
                                        <td>
                                          <span className="CmApp-ColorsApp-ColorLevels-temperature-display">
                                            0
                                          </span>
                                          <span
                                            className="CmApp-SubApps-spinner_swatch CmApp-ColorsApp-ColorLevels-temperature-swatch"
                                            style={{
                                              backgroundColor:
                                                "rgb(255, 255, 255)",
                                            }}
                                          >
                                            {" "}
                                          </span>
                                        </td>
                                        <td>
                                          <div
                                            style={{ display: "inline-flex" }}
                                          >
                                            <div className="app_bttn_group">
                                              <button
                                                title="Cooler Color"
                                                className="app_bttn  app_bttn_dark CmApp-ColorsApp-ColorLevels-temperature-decrease"
                                                alt="Cooler Color"
                                                id="CmApp-ColorsApp-ColorLevels-temperature-decrease"
                                              >
                                                <span>-</span>
                                              </button>
                                              <button
                                                title="Warmer Color"
                                                className="app_bttn  app_bttn_dark CmApp-ColorsApp-ColorLevels-temperature-increase"
                                                alt="Warmer Color"
                                                id="CmApp-ColorsApp-ColorLevels-temperature-increase"
                                              >
                                                <span>+</span>
                                              </button>
                                            </div>
                                            <div className="app_bttn_group">
                                              <button
                                                title="Reset"
                                                className="disabled app_bttn  app_bttn_dark CmApp-ColorsApp-ColorLevels-temperature-reset"
                                                alt="Reset"
                                                id="CmApp-ColorsApp-ColorLevels-temperature-reset"
                                              >
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  viewBox="0 0 20 20"
                                                >
                                                  <path
                                                    className="tool-dark"
                                                    d="M11.13,5H4.59L6.74,2.85,6,2.15l-3,3a.5.5,0,0,0,0,.7l3,3,.71-.7L4.59,6h6.54A4.84,4.84,0,0,1,16,10.84v.32A4.84,4.84,0,0,1,11.13,16H3.88v1h7.25A5.85,5.85,0,0,0,17,11.16v-.32A5.85,5.85,0,0,0,11.13,5Z"
                                                  ></path>
                                                </svg>
                                              </button>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>

                                      <tr className="CmApp-ColorsApp-ColorLevels-saturation-container CmApp-SubApps-unit_row">
                                        <td>
                                          <a
                                            target="tutorial"
                                            href="/tutorials/finishing-touches#colors"
                                          >
                                            Saturation
                                          </a>
                                          :
                                        </td>
                                        <td>
                                          <span className="CmApp-ColorsApp-ColorLevels-saturation-display">
                                            0
                                          </span>
                                        </td>
                                        <td>
                                          <div
                                            style={{ display: "inline-flex" }}
                                          >
                                            <div className="app_bttn_group">
                                              <button
                                                title="Saturate"
                                                className="app_bttn  app_bttn_dark CmApp-ColorsApp-ColorLevels-saturation-decrease"
                                                alt="Saturate"
                                                id="CmApp-ColorsApp-ColorLevels-saturation-decrease"
                                              >
                                                <span>-</span>
                                              </button>
                                              <button
                                                title="Desaturate"
                                                className="app_bttn  app_bttn_dark CmApp-ColorsApp-ColorLevels-saturation-increase"
                                                alt="Desaturate"
                                                id="CmApp-ColorsApp-ColorLevels-saturation-increase"
                                              >
                                                <span>+</span>
                                              </button>
                                            </div>
                                            <div className="app_bttn_group">
                                              <button
                                                title="Reset"
                                                className="app_bttn  app_bttn_dark CmApp-ColorsApp-ColorLevels-saturation-reset disabled"
                                                alt="Reset"
                                                id="CmApp-ColorsApp-ColorLevels-saturation-reset"
                                              >
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  viewBox="0 0 20 20"
                                                >
                                                  <path
                                                    className="tool-dark"
                                                    d="M11.13,5H4.59L6.74,2.85,6,2.15l-3,3a.5.5,0,0,0,0,.7l3,3,.71-.7L4.59,6h6.54A4.84,4.84,0,0,1,16,10.84v.32A4.84,4.84,0,0,1,11.13,16H3.88v1h7.25A5.85,5.85,0,0,0,17,11.16v-.32A5.85,5.85,0,0,0,11.13,5Z"
                                                  ></path>
                                                </svg>
                                              </button>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                  <div className="CmApp-SubApps-sec_footer">
                                    <div className="app_bttn_group">
                                      <button
                                        title="Set Levels Automatically"
                                        className="app_bttn  app_bttn_dark CmApp-ColorsApp-ColorLevels-auto"
                                        alt="Set Levels Automatically"
                                        id="CmApp-ColorsApp-ColorLevels-auto"
                                      >
                                        <span className="SettingsGroups-Colors-AutoLevels-outline">
                                          Auto Levels
                                        </span>
                                      </button>
                                      <button
                                        title="Reset All Levels"
                                        className="app_bttn  app_bttn_dark CmApp-ColorsApp-ColorLevels-reset disabled"
                                        alt="Reset All Levels"
                                        id="CmApp-ColorsApp-ColorLevels-reset"
                                      >
                                        <span>Reset</span>
                                      </button>
                                    </div>
                                    <div style={{ marginLeft: "5px" }}>
                                      <div className="dropdown">
                                        <button
                                          aria-expanded="false"
                                          type="button"
                                          aria-haspopup="true"
                                          className="CmApp-Tools-tool dropdown-toggle CmApp-Tools-sticky_settings_button SettingsGroups-Colors-AutoLevels-button btn-xs"
                                          data-toggle="dropdown"
                                          onClick={() => {
                                            this.setState({
                                              ColorsSettingsPopup: !this.state
                                                .ColorsSettingsPopup,
                                            });
                                          }}
                                        >
                                          <span>
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              viewBox="0 0 20 20"
                                            >
                                              <path
                                                className="tool-dark"
                                                d="M10.91,19H9.09a.5.5,0,0,1-.48-.36l-.53-1.85-.23-.07a6.1,6.1,0,0,1-1.08-.47l-.21-.11-1.68.94A.47.47,0,0,1,4.29,17L3,15.72a.51.51,0,0,1-.08-.6l.93-1.68-.11-.21a7.07,7.07,0,0,1-.45-1.08l-.07-.23-1.85-.53A.5.5,0,0,1,1,10.91V9.07a.5.5,0,0,1,.36-.48l1.86-.53.07-.22a6.69,6.69,0,0,1,.44-1.08l.11-.22L2.9,4.87A.51.51,0,0,1,3,4.27L4.29,3a.5.5,0,0,1,.59-.08l1.68.94.21-.11a8.06,8.06,0,0,1,1.08-.47l.23-.07.53-1.83A.5.5,0,0,1,9.09,1h1.82a.5.5,0,0,1,.48.36l.53,1.83.23.07a8.06,8.06,0,0,1,1.08.47l.21.11,1.68-.94a.48.48,0,0,1,.59.08L17,4.27a.51.51,0,0,1,.09.6l-.94,1.67.11.22a6.69,6.69,0,0,1,.44,1.08l.07.22,1.86.53a.5.5,0,0,1,.36.48v1.84a.5.5,0,0,1-.36.48l-1.85.53-.07.23a7.07,7.07,0,0,1-.45,1.08l-.11.21.93,1.68a.51.51,0,0,1-.08.6L15.71,17a.47.47,0,0,1-.59.08l-1.68-.94-.21.11a6.1,6.1,0,0,1-1.08.47l-.23.07-.53,1.85A.51.51,0,0,1,10.91,19Z"
                                              ></path>
                                              <path
                                                className="tool-light"
                                                d="M9.47,18h1.06L11,16.26a.5.5,0,0,1,.32-.34l.48-.15a7,7,0,0,0,.93-.4l.45-.24a.51.51,0,0,1,.48,0l1.58.89.75-.75-.87-1.59a.47.47,0,0,1,0-.47l.23-.45a6.14,6.14,0,0,0,.39-.93l.15-.48a.5.5,0,0,1,.34-.32L18,10.53V9.45L16.25,9a.49.49,0,0,1-.34-.33l-.15-.47a6.8,6.8,0,0,0-.38-.93l-.23-.46a.47.47,0,0,1,0-.47L16,4.71,15.28,4l-1.58.88a.48.48,0,0,1-.48,0l-.45-.23a6.06,6.06,0,0,0-.93-.41l-.48-.15A.5.5,0,0,1,11,3.72L10.54,2H9.46L9,3.72a.5.5,0,0,1-.32.34l-.48.15a6.06,6.06,0,0,0-.93.41l-.45.23a.48.48,0,0,1-.48,0L4.72,4,4,4.71l.89,1.58a.51.51,0,0,1,0,.48l-.23.45a6.8,6.8,0,0,0-.38.93l-.15.47A.49.49,0,0,1,3.75,9L2,9.45v1.08L3.74,11a.5.5,0,0,1,.34.32l.15.48a5.74,5.74,0,0,0,.39.93l.23.45a.47.47,0,0,1,0,.47L4,15.28l.75.75,1.58-.89a.51.51,0,0,1,.48,0l.45.24a7,7,0,0,0,.93.4l.48.15a.5.5,0,0,1,.32.34Z"
                                              ></path>
                                              <path
                                                className="tool-dark"
                                                d="M10.05,12.83a2.74,2.74,0,1,1,2.74-2.74A2.74,2.74,0,0,1,10.05,12.83Z"
                                              ></path>
                                              <path
                                                className="tool-white"
                                                d="M10.05,8.36a1.74,1.74,0,1,0,1.74,1.73A1.74,1.74,0,0,0,10.05,8.36Z"
                                              ></path>
                                            </svg>
                                          </span>
                                        </button>

                                        {this.state.ColorsSettingsPopup ? (
                                          <ul className="dropdown-menu modern_menu dropdown-menu-right">
                                            <li className="disabled bg-warning">
                                              <a
                                                href="#"
                                                className="i"
                                                style={{ whiteSpace: "normal" }}
                                              >
                                                Please log in or create an
                                                account to use the default
                                                settings feature.{" "}
                                              </a>
                                            </li>
                                            <li
                                              role="separator"
                                              className="divider"
                                            ></li>
                                            <li className="CmApp-StickySettings-set disabled">
                                              <a className="SettingsGroups-Colors-AutoLevels-setStickyToCurrent disabled">
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  viewBox="0 0 15 15"
                                                >
                                                  <path
                                                    className="tool-dark"
                                                    d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                                  ></path>
                                                  <path
                                                    className="tool-light"
                                                    d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                                  ></path>
                                                </svg>
                                                <span className="CmApp-StickySettings-enabled">
                                                  Enable by default
                                                </span>
                                                <span className="CmApp-StickySettings-disabled">
                                                  Enabled by default
                                                </span>
                                              </a>
                                            </li>

                                            <li className="CmApp-StickySettings-default_disabled disabled">
                                              <a className="SettingsGroups-Colors-AutoLevels-setCurrentAndStickyToFactory disabled">
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  viewBox="0 0 15 15"
                                                >
                                                  <path
                                                    className="tool-dark"
                                                    d="M8.82,7.5a2.7,2.7,0,0,1,2.7-2.7,2.09,2.09,0,0,1,.35,0l1.4-1.38L11.86,2,7.51,6.32,3.22,2,1.79,3.38,6.08,7.73,1.73,12l1.41,1.43L7.49,9.16l4.29,4.35,1.43-1.41-1.89-1.92A2.69,2.69,0,0,1,8.82,7.5Z"
                                                  ></path>
                                                  <circle
                                                    className="tool-light"
                                                    cx="11.52"
                                                    cy="7.5"
                                                    r="1.5"
                                                  ></circle>
                                                </svg>{" "}
                                                <span className="CmApp-StickySettings-enabled">
                                                  Disable by default
                                                </span>
                                                <span className="CmApp-StickySettings-disabled">
                                                  Disabled by default
                                                </span>
                                              </a>
                                            </li>
                                            <li
                                              role="separator"
                                              className="divider"
                                            ></li>
                                            <li className="">
                                              <a className="sticky_settings">
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  viewBox="0 0 15 15"
                                                >
                                                  <rect
                                                    className="tool-dark"
                                                    x="5.83"
                                                    y="2.87"
                                                    width="7.99"
                                                    height="1.33"
                                                    transform="translate(19.66 7.08) rotate(180)"
                                                  ></rect>
                                                  <rect
                                                    className="tool-dark"
                                                    x="5.83"
                                                    y="6.87"
                                                    width="7.99"
                                                    height="1.33"
                                                    transform="translate(19.66 15.07) rotate(180)"
                                                  ></rect>
                                                  <rect
                                                    className="tool-dark"
                                                    x="5.83"
                                                    y="10.87"
                                                    width="7.99"
                                                    height="1.33"
                                                    transform="translate(19.66 23.07) rotate(180)"
                                                  ></rect>
                                                  <circle
                                                    className="tool-light"
                                                    cx="2.47"
                                                    cy="7.5"
                                                    r="1.33"
                                                  ></circle>
                                                  <circle
                                                    className="tool-light"
                                                    cx="2.47"
                                                    cy="3.48"
                                                    r="1.33"
                                                  ></circle>
                                                  <circle
                                                    className="tool-light"
                                                    cx="2.47"
                                                    cy="11.53"
                                                    r="1.33"
                                                  ></circle>
                                                </svg>
                                                <span>Show all Defaults</span>
                                              </a>
                                            </li>
                                          </ul>
                                        ) : null}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <hr style={{ marginBottom: 0 }} />
                              </div>
                              <div className="CmApp-ColorsApp-WhiteBalance-container">
                                <div className="CmApp-SubApps-checkbox_sec">
                                  <div className="CmApp-SubApps-sec_header">
                                    <label className="CmApp-SubApps-checkbox">
                                      <input
                                        type="checkbox"
                                        id="CmApp-ColorsApp-WhiteBalance-Enabled"
                                      />
                                      <span>White Balance</span>
                                    </label>
                                  </div>
                                  <div className="CmApp-SubApps-sec_body CmApp-ColorsApp-WhiteBalance-controls hidden">
                                    <div className="CmApp-SubApps-color_picker_container">
                                      <span
                                        className="CmApp-SubApps-eyedropper_color_swatch"
                                        id="CmApp-ColorsApp-WhiteBalance-Swatch"
                                        style={{
                                          backgroundColor: "rgb(255, 255, 255)",
                                        }}
                                      >
                                        {" "}
                                      </span>
                                      <div
                                        className="tool-buttons-group CmApp-SecondaryBar-group"
                                        data-toggle="buttons"
                                      >
                                        <label
                                          title="White Balance Eyedropper"
                                          className="tool-radio-button eyedropper-gray-tool CmApp-Tools-tool CmApp-Tools-tool_radio_button"
                                          id="eyedropper-gray-tool"
                                        >
                                          <input
                                            type="radio"
                                            value="app-radio-tool-eyedropper-gray-tool"
                                            name="app-radio-tool"
                                          />
                                          <span>
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              viewBox="0 0 20 20"
                                            >
                                              <path
                                                className="tool-dark"
                                                d="M17.09,6.5l1.15-1.15a2.62,2.62,0,0,0-3.71-3.7L13.38,2.79l-.64-.65a2,2,0,0,0-2.71,0L7.68,4.5,10,6.85,1.88,15a3,3,0,0,0-1,2v2h2a3,3,0,0,0,2-1L13,9.85l2.35,2.36,2.36-2.36a1.92,1.92,0,0,0,0-2.7Z"
                                              ></path>
                                              <path
                                                className="tool-light"
                                                d="M9.09,4.5l6.29,6.29L17,9.14a.89.89,0,0,0,0-1.28L15.68,6.5l1.85-1.85a1.62,1.62,0,1,0-2.29-2.3L13.38,4.21,12,2.85a.94.94,0,0,0-1.29,0Z"
                                              ></path>
                                              <path
                                                className="tool-white"
                                                d="M4.18,17.29a2.09,2.09,0,0,1-1.3.71h-1V17a2,2,0,0,1,.71-1.29l8.15-8.15,1.58,1.59Z"
                                              ></path>
                                            </svg>
                                          </span>
                                        </label>

                                        <label
                                          title="Pan/Edit Shadows"
                                          className="tool-radio-button pan-tool CmApp-Tools-tool CmApp-Tools-tool_radio_button active"
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
                                                className="tool-dark"
                                                d="M9.49,18.18H8.25l-.83,0a.5.5,0,0,1-.49-.59,1.49,1.49,0,0,0-.06-.94c-.18-.15-.43-.38-.66-.61l-.54-.5-.91-1a7.75,7.75,0,0,1-.54-.84c-.21-.36-.47-.79-.8-1.28a6.14,6.14,0,0,0-.55-.65,5.34,5.34,0,0,1-.81-1,2.31,2.31,0,0,1-.23-1.79A1.76,1.76,0,0,1,3.77,7.72a2.57,2.57,0,0,1,1.56.68l.08.07c-.07-.19-.13-.35-.2-.51S5.08,7.64,5,7.48a7.57,7.57,0,0,0-.3-.74l-.21-.46A13.23,13.23,0,0,1,4,4.7,2,2,0,0,1,4.35,3a2,2,0,0,1,2-.54,2.58,2.58,0,0,1,1.21,1A4.78,4.78,0,0,1,8,4.38c0-.15,0-.31,0-.47s.07-.67.09-.82a1.74,1.74,0,0,1,1-1.39,2.29,2.29,0,0,1,1.87,0,1.67,1.67,0,0,1,1,1.39,2.12,2.12,0,0,1,.62-.44,1.9,1.9,0,0,1,2,.37,2.42,2.42,0,0,1,.64,1.5c0,.29,0,.62,0,.93,0,.13,0,.26,0,.37l0,0,.11-.18a2,2,0,0,1,.91-.77,1.46,1.46,0,0,1,1.14,0,1.67,1.67,0,0,1,.89.9,2.75,2.75,0,0,1,0,1.16l0,.22a9.22,9.22,0,0,1-.37,1.77c-.1.35-.22.91-.35,1.66l-.06.29c-.08.5-.22,1.26-.33,1.65A6.55,6.55,0,0,1,16.45,14a6.94,6.94,0,0,0-1.16,1.7,2.46,2.46,0,0,0-.08.65,2.18,2.18,0,0,0,0,.28,3.2,3.2,0,0,0,.1.8.49.49,0,0,1-.06.41.51.51,0,0,1-.35.22,6,6,0,0,1-1.43,0c-.62-.09-1.15-.93-1.35-1.27-.24.46-.79,1.22-1.36,1.29A11,11,0,0,1,9.49,18.18ZM8,17.16h.3c.91,0,1.86,0,2.36,0a3.49,3.49,0,0,0,.73-.92.89.89,0,0,1,1.58.05,2.56,2.56,0,0,0,.69.86,3.67,3.67,0,0,0,.59,0,3.37,3.37,0,0,1,0-.55v-.24a3.55,3.55,0,0,1,.1-.83,7.1,7.1,0,0,1,1.35-2.11,5.6,5.6,0,0,0,.58-1.26c.1-.34.23-1.09.31-1.54l.05-.3c.14-.79.27-1.36.37-1.72A9.54,9.54,0,0,0,17.32,7l0-.23a4.74,4.74,0,0,0,0-.7A.65.65,0,0,0,17,5.71a.43.43,0,0,0-.35,0,.93.93,0,0,0-.47.39l-.12.19a3.61,3.61,0,0,0-.29.48c-.12.24-.31.73-.36.86s-.17.46-.26.75a.54.54,0,0,1-.58.36c-.45-.08-.43-.54-.42-.71V7.35c0-.48,0-.9,0-1.53,0-.13,0-.29,0-.45a7.3,7.3,0,0,0,0-.81,1.39,1.39,0,0,0-.37-.89A1,1,0,0,0,13,3.52a1.06,1.06,0,0,0-.57.68,18,18,0,0,0-.28,3c0,.41,0,.76-.05.95a.5.5,0,0,1-.52.47c-.33,0-.44-.09-.48-.56h0v0c0-.23,0-.54,0-1V6.33c0-.49,0-1.09,0-2,0-.13-.08-1-.1-1.08-.06-.47-.26-.6-.41-.66a1.28,1.28,0,0,0-1.05,0,.74.74,0,0,0-.42.65c0,.12-.08.55-.08.67C9,5.11,9,6,9.05,7l0,1.21a.5.5,0,0,1-.45.51.51.51,0,0,1-.54-.4L8,7.81A10.88,10.88,0,0,0,7.4,5.58a7.42,7.42,0,0,0-.7-1.53A1.64,1.64,0,0,0,6,3.44a1,1,0,0,0-.84.19A1,1,0,0,0,5,4.47a10.36,10.36,0,0,0,.45,1.42l.19.44A8.14,8.14,0,0,1,6,7.15a3,3,0,0,0,.16.42,7.15,7.15,0,0,1,.33.89c.16.52.26.92.34,1.25l.09.38h0c0,.18.15.59-.24.78s-.64-.16-.75-.32l-.29-.4a3.07,3.07,0,0,0-.2-.27,9.78,9.78,0,0,0-.72-.72,1.65,1.65,0,0,0-1-.44.76.76,0,0,0-.9.54,1.4,1.4,0,0,0,.17,1,4.42,4.42,0,0,0,.67.83,9,9,0,0,1,.64.77c.34.5.61,1,.83,1.33a7.32,7.32,0,0,0,.44.71l.85.93c.11.1.32.29.52.49l.62.57A1.68,1.68,0,0,1,8,17.16Z"
                                              ></path>
                                              <path
                                                className="tool-light"
                                                d="M8,17.16h.3c.91,0,1.86,0,2.36,0a3.49,3.49,0,0,0,.73-.92.89.89,0,0,1,1.58.05,2.56,2.56,0,0,0,.69.86,3.67,3.67,0,0,0,.59,0,3.37,3.37,0,0,1,0-.55v-.24a3.55,3.55,0,0,1,.1-.83,7.1,7.1,0,0,1,1.35-2.11,5.6,5.6,0,0,0,.58-1.26c.1-.34.23-1.09.31-1.54l.05-.3c.14-.79.27-1.36.37-1.72A9.54,9.54,0,0,0,17.32,7l0-.23a4.74,4.74,0,0,0,0-.7A.65.65,0,0,0,17,5.71a.43.43,0,0,0-.35,0,.93.93,0,0,0-.47.39l-.12.19a3.61,3.61,0,0,0-.29.48c-.12.24-.31.73-.36.86s-.17.46-.26.75a.54.54,0,0,1-.58.36c-.45-.08-.43-.54-.42-.71V7.35c0-.48,0-.9,0-1.53,0-.13,0-.29,0-.45a7.3,7.3,0,0,0,0-.81,1.39,1.39,0,0,0-.37-.89A1,1,0,0,0,13,3.52a1.06,1.06,0,0,0-.57.68,18,18,0,0,0-.28,3c0,.41,0,.76-.05.95a.5.5,0,0,1-.52.47c-.33,0-.44-.09-.48-.56h0v0c0-.23,0-.54,0-1V6.33c0-.49,0-1.09,0-2,0-.13-.08-1-.1-1.08-.06-.47-.26-.6-.41-.66a1.28,1.28,0,0,0-1.05,0,.74.74,0,0,0-.42.65c0,.12-.08.55-.08.67C9,5.11,9,6,9.05,7l0,1.21a.5.5,0,0,1-.45.51.51.51,0,0,1-.54-.4L8,7.81A10.88,10.88,0,0,0,7.4,5.58a7.42,7.42,0,0,0-.7-1.53A1.64,1.64,0,0,0,6,3.44a1,1,0,0,0-.84.19A1,1,0,0,0,5,4.47a10.36,10.36,0,0,0,.45,1.42l.19.44A8.14,8.14,0,0,1,6,7.15a3,3,0,0,0,.16.42,7.15,7.15,0,0,1,.33.89c.16.52.26.92.34,1.25l.09.38h0c0,.18.15.59-.24.78s-.64-.16-.75-.32l-.29-.4a3.07,3.07,0,0,0-.2-.27,9.78,9.78,0,0,0-.72-.72,1.65,1.65,0,0,0-1-.44.76.76,0,0,0-.9.54,1.4,1.4,0,0,0,.17,1,4.42,4.42,0,0,0,.67.83,9,9,0,0,1,.64.77c.34.5.61,1,.83,1.33a7.32,7.32,0,0,0,.44.71l.85.93c.11.1.32.29.52.49l.62.57A1.68,1.68,0,0,1,8,17.16Z"
                                              ></path>
                                              <rect
                                                className="tool-dark"
                                                x="12.88"
                                                y="11"
                                                width="1"
                                                height="4"
                                              ></rect>
                                              <rect
                                                className="tool-dark"
                                                x="10.88"
                                                y="11"
                                                width="1"
                                                height="4"
                                                transform="translate(-0.05 0.05) rotate(-0.24)"
                                              ></rect>
                                              <rect
                                                className="tool-dark"
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
                                    <p className="comment">
                                      Pick a color that should be neutral
                                      (white/gray)
                                    </p>
                                  </div>
                                </div>
                                <hr style={{ marginTop: "8px" }} />
                              </div>
                              <div className="CmApp-ColorsApp-ColorCast-container">
                                <div className="CmApp-SubApps-checkbox_sec">
                                  <div className="CmApp-SubApps-sec_header">
                                    <label className="CmApp-SubApps-checkbox">
                                      <input
                                        type="checkbox"
                                        id="CmApp-ColorsApp-ColorCast-RemovalEnabled"
                                      />
                                      <span>Color Cast Removal</span>
                                    </label>
                                  </div>
                                  <div className="CmApp-ColorsApp-ColorCast-controls hidden">
                                    <div className="CmApp-SubApps-sec_body">
                                      <div className="CmApp-SubApps-color_picker_container">
                                        <span
                                          className="CmApp-SubApps-eyedropper_color_swatch color-white"
                                          id="CmApp-ColorsApp-ColorCast-Swatch "
                                        >
                                          {" "}
                                        </span>
                                        <div
                                          className="tool-buttons-group CmApp-SecondaryBar-group"
                                          data-toggle="buttons"
                                        >
                                          <label
                                            title="Color Cast Eyedropper"
                                            className="tool-radio-button eyedropper-bg-tool CmApp-Tools-tool CmApp-Tools-tool_radio_button"
                                            id="eyedropper-bg-tool"
                                          >
                                            <input
                                              type="radio"
                                              value="app-radio-tool-eyedropper-bg-tool"
                                              name="app-radio-tool"
                                            />
                                            <span>
                                              <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 20 20"
                                              >
                                                <path
                                                  className="tool-dark"
                                                  d="M17.09,6.5l1.15-1.15a2.62,2.62,0,0,0-3.71-3.7L13.38,2.79l-.64-.65a2,2,0,0,0-2.71,0L7.68,4.5,10,6.85,1.88,15a3,3,0,0,0-1,2v2h2a3,3,0,0,0,2-1L13,9.85l2.35,2.36,2.36-2.36a1.92,1.92,0,0,0,0-2.7Z"
                                                ></path>
                                                <path
                                                  className="tool-light"
                                                  d="M9.09,4.5l6.29,6.29L17,9.14a.89.89,0,0,0,0-1.28L15.68,6.5l1.85-1.85a1.62,1.62,0,1,0-2.29-2.3L13.38,4.21,12,2.85a.94.94,0,0,0-1.29,0Z"
                                                ></path>
                                                <path
                                                  className="tool-white"
                                                  d="M4.18,17.29a2.09,2.09,0,0,1-1.3.71h-1V17a2,2,0,0,1,.71-1.29l8.15-8.15,1.58,1.59Z"
                                                ></path>
                                              </svg>
                                            </span>
                                          </label>

                                          <label
                                            title="Pan/Edit Shadows"
                                            className="tool-radio-button pan-tool CmApp-Tools-tool CmApp-Tools-tool_radio_button active"
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
                                                  className="tool-dark"
                                                  d="M9.49,18.18H8.25l-.83,0a.5.5,0,0,1-.49-.59,1.49,1.49,0,0,0-.06-.94c-.18-.15-.43-.38-.66-.61l-.54-.5-.91-1a7.75,7.75,0,0,1-.54-.84c-.21-.36-.47-.79-.8-1.28a6.14,6.14,0,0,0-.55-.65,5.34,5.34,0,0,1-.81-1,2.31,2.31,0,0,1-.23-1.79A1.76,1.76,0,0,1,3.77,7.72a2.57,2.57,0,0,1,1.56.68l.08.07c-.07-.19-.13-.35-.2-.51S5.08,7.64,5,7.48a7.57,7.57,0,0,0-.3-.74l-.21-.46A13.23,13.23,0,0,1,4,4.7,2,2,0,0,1,4.35,3a2,2,0,0,1,2-.54,2.58,2.58,0,0,1,1.21,1A4.78,4.78,0,0,1,8,4.38c0-.15,0-.31,0-.47s.07-.67.09-.82a1.74,1.74,0,0,1,1-1.39,2.29,2.29,0,0,1,1.87,0,1.67,1.67,0,0,1,1,1.39,2.12,2.12,0,0,1,.62-.44,1.9,1.9,0,0,1,2,.37,2.42,2.42,0,0,1,.64,1.5c0,.29,0,.62,0,.93,0,.13,0,.26,0,.37l0,0,.11-.18a2,2,0,0,1,.91-.77,1.46,1.46,0,0,1,1.14,0,1.67,1.67,0,0,1,.89.9,2.75,2.75,0,0,1,0,1.16l0,.22a9.22,9.22,0,0,1-.37,1.77c-.1.35-.22.91-.35,1.66l-.06.29c-.08.5-.22,1.26-.33,1.65A6.55,6.55,0,0,1,16.45,14a6.94,6.94,0,0,0-1.16,1.7,2.46,2.46,0,0,0-.08.65,2.18,2.18,0,0,0,0,.28,3.2,3.2,0,0,0,.1.8.49.49,0,0,1-.06.41.51.51,0,0,1-.35.22,6,6,0,0,1-1.43,0c-.62-.09-1.15-.93-1.35-1.27-.24.46-.79,1.22-1.36,1.29A11,11,0,0,1,9.49,18.18ZM8,17.16h.3c.91,0,1.86,0,2.36,0a3.49,3.49,0,0,0,.73-.92.89.89,0,0,1,1.58.05,2.56,2.56,0,0,0,.69.86,3.67,3.67,0,0,0,.59,0,3.37,3.37,0,0,1,0-.55v-.24a3.55,3.55,0,0,1,.1-.83,7.1,7.1,0,0,1,1.35-2.11,5.6,5.6,0,0,0,.58-1.26c.1-.34.23-1.09.31-1.54l.05-.3c.14-.79.27-1.36.37-1.72A9.54,9.54,0,0,0,17.32,7l0-.23a4.74,4.74,0,0,0,0-.7A.65.65,0,0,0,17,5.71a.43.43,0,0,0-.35,0,.93.93,0,0,0-.47.39l-.12.19a3.61,3.61,0,0,0-.29.48c-.12.24-.31.73-.36.86s-.17.46-.26.75a.54.54,0,0,1-.58.36c-.45-.08-.43-.54-.42-.71V7.35c0-.48,0-.9,0-1.53,0-.13,0-.29,0-.45a7.3,7.3,0,0,0,0-.81,1.39,1.39,0,0,0-.37-.89A1,1,0,0,0,13,3.52a1.06,1.06,0,0,0-.57.68,18,18,0,0,0-.28,3c0,.41,0,.76-.05.95a.5.5,0,0,1-.52.47c-.33,0-.44-.09-.48-.56h0v0c0-.23,0-.54,0-1V6.33c0-.49,0-1.09,0-2,0-.13-.08-1-.1-1.08-.06-.47-.26-.6-.41-.66a1.28,1.28,0,0,0-1.05,0,.74.74,0,0,0-.42.65c0,.12-.08.55-.08.67C9,5.11,9,6,9.05,7l0,1.21a.5.5,0,0,1-.45.51.51.51,0,0,1-.54-.4L8,7.81A10.88,10.88,0,0,0,7.4,5.58a7.42,7.42,0,0,0-.7-1.53A1.64,1.64,0,0,0,6,3.44a1,1,0,0,0-.84.19A1,1,0,0,0,5,4.47a10.36,10.36,0,0,0,.45,1.42l.19.44A8.14,8.14,0,0,1,6,7.15a3,3,0,0,0,.16.42,7.15,7.15,0,0,1,.33.89c.16.52.26.92.34,1.25l.09.38h0c0,.18.15.59-.24.78s-.64-.16-.75-.32l-.29-.4a3.07,3.07,0,0,0-.2-.27,9.78,9.78,0,0,0-.72-.72,1.65,1.65,0,0,0-1-.44.76.76,0,0,0-.9.54,1.4,1.4,0,0,0,.17,1,4.42,4.42,0,0,0,.67.83,9,9,0,0,1,.64.77c.34.5.61,1,.83,1.33a7.32,7.32,0,0,0,.44.71l.85.93c.11.1.32.29.52.49l.62.57A1.68,1.68,0,0,1,8,17.16Z"
                                                ></path>
                                                <path
                                                  className="tool-light"
                                                  d="M8,17.16h.3c.91,0,1.86,0,2.36,0a3.49,3.49,0,0,0,.73-.92.89.89,0,0,1,1.58.05,2.56,2.56,0,0,0,.69.86,3.67,3.67,0,0,0,.59,0,3.37,3.37,0,0,1,0-.55v-.24a3.55,3.55,0,0,1,.1-.83,7.1,7.1,0,0,1,1.35-2.11,5.6,5.6,0,0,0,.58-1.26c.1-.34.23-1.09.31-1.54l.05-.3c.14-.79.27-1.36.37-1.72A9.54,9.54,0,0,0,17.32,7l0-.23a4.74,4.74,0,0,0,0-.7A.65.65,0,0,0,17,5.71a.43.43,0,0,0-.35,0,.93.93,0,0,0-.47.39l-.12.19a3.61,3.61,0,0,0-.29.48c-.12.24-.31.73-.36.86s-.17.46-.26.75a.54.54,0,0,1-.58.36c-.45-.08-.43-.54-.42-.71V7.35c0-.48,0-.9,0-1.53,0-.13,0-.29,0-.45a7.3,7.3,0,0,0,0-.81,1.39,1.39,0,0,0-.37-.89A1,1,0,0,0,13,3.52a1.06,1.06,0,0,0-.57.68,18,18,0,0,0-.28,3c0,.41,0,.76-.05.95a.5.5,0,0,1-.52.47c-.33,0-.44-.09-.48-.56h0v0c0-.23,0-.54,0-1V6.33c0-.49,0-1.09,0-2,0-.13-.08-1-.1-1.08-.06-.47-.26-.6-.41-.66a1.28,1.28,0,0,0-1.05,0,.74.74,0,0,0-.42.65c0,.12-.08.55-.08.67C9,5.11,9,6,9.05,7l0,1.21a.5.5,0,0,1-.45.51.51.51,0,0,1-.54-.4L8,7.81A10.88,10.88,0,0,0,7.4,5.58a7.42,7.42,0,0,0-.7-1.53A1.64,1.64,0,0,0,6,3.44a1,1,0,0,0-.84.19A1,1,0,0,0,5,4.47a10.36,10.36,0,0,0,.45,1.42l.19.44A8.14,8.14,0,0,1,6,7.15a3,3,0,0,0,.16.42,7.15,7.15,0,0,1,.33.89c.16.52.26.92.34,1.25l.09.38h0c0,.18.15.59-.24.78s-.64-.16-.75-.32l-.29-.4a3.07,3.07,0,0,0-.2-.27,9.78,9.78,0,0,0-.72-.72,1.65,1.65,0,0,0-1-.44.76.76,0,0,0-.9.54,1.4,1.4,0,0,0,.17,1,4.42,4.42,0,0,0,.67.83,9,9,0,0,1,.64.77c.34.5.61,1,.83,1.33a7.32,7.32,0,0,0,.44.71l.85.93c.11.1.32.29.52.49l.62.57A1.68,1.68,0,0,1,8,17.16Z"
                                                ></path>
                                                <rect
                                                  className="tool-dark"
                                                  x="12.88"
                                                  y="11"
                                                  width="1"
                                                  height="4"
                                                ></rect>
                                                <rect
                                                  className="tool-dark"
                                                  x="10.88"
                                                  y="11"
                                                  width="1"
                                                  height="4"
                                                  transform="translate(-0.05 0.05) rotate(-0.24)"
                                                ></rect>
                                                <rect
                                                  className="tool-dark"
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
                                    </div>
                                    <table className="CmApp-SubApps-table table table-condensed">
                                      <tbody>
                                        <tr className="CmApp-ColorsApp-ColorCast-ForegroundProtection-container CmApp-SubApps-unit_row">
                                          <td>
                                            <a
                                              target="tutorial"
                                              href="/tutorials/finishing-touches#colors"
                                            >
                                              Foreground Guard
                                            </a>
                                            :
                                          </td>
                                          <td>
                                            <span className="CmApp-ColorsApp-ColorCast-ForegroundProtection-display">
                                              +4
                                            </span>
                                          </td>
                                          <td>
                                            <div
                                              style={{ display: "inline-flex" }}
                                            >
                                              <div className="app_bttn_group">
                                                <button
                                                  title="Preserve Less Foreground Saturation"
                                                  className="app_bttn  app_bttn_dark CmApp-ColorsApp-ColorCast-ForegroundProtection-decrease"
                                                  alt="Preserve Less Foreground Saturation"
                                                  id="CmApp-ColorsApp-ColorCast-ForegroundProtection-decrease"
                                                >
                                                  <span>-</span>
                                                </button>
                                                <button
                                                  title="Preserve More Foreground Saturation"
                                                  className="app_bttn  app_bttn_dark CmApp-ColorsApp-ColorCast-ForegroundProtection-increase"
                                                  alt="Preserve More Foreground Saturation"
                                                  id="CmApp-ColorsApp-ColorCast-ForegroundProtection-increase"
                                                >
                                                  <span>+</span>
                                                </button>
                                              </div>
                                              <div className="app_bttn_group">
                                                <button
                                                  title="Reset"
                                                  className="disabled app_bttn  app_bttn_dark CmApp-ColorsApp-ColorCast-ForegroundProtection-reset"
                                                  alt="Reset"
                                                  id="CmApp-ColorsApp-ColorCast-ForegroundProtection-reset"
                                                >
                                                  <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 20 20"
                                                  >
                                                    <path
                                                      className="tool-dark"
                                                      d="M11.13,5H4.59L6.74,2.85,6,2.15l-3,3a.5.5,0,0,0,0,.7l3,3,.71-.7L4.59,6h6.54A4.84,4.84,0,0,1,16,10.84v.32A4.84,4.84,0,0,1,11.13,16H3.88v1h7.25A5.85,5.85,0,0,0,17,11.16v-.32A5.85,5.85,0,0,0,11.13,5Z"
                                                    ></path>
                                                  </svg>
                                                </button>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                                <hr style={{ marginTop: "8px" }} />
                              </div>
                              <div className="CmApp-SubApps-sec_footer">
                                <div></div>
                                <div className="pull-right">
                                  <div className="app_bttn_group">
                                    <button className="CmApp-ColorsApp-reset_button app_bttn app_bttn_white app_bttn_large">
                                      Reset
                                    </button>
                                  </div>
                                  <div className="app_bttn_group">
                                    <button className="CmApp-ColorsApp-close_button CmApp-SubApps-subAppCloseButton app_bttn app_bttn_dark app_bttn_large">
                                      Ok
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </SideTab>
                        <SideTab
                          name="Crop"
                          img={
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                            >
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
                          }
                        >
                          <div
                            className="subapp_sidebar"
                            id="CmApp-CropApp-Sidebar"
                          >
                            <div className="scrollable">
                              <div className="CmApp-CropApp-CropResize-container">
                                <div className="SettingsGroups-Crop-Mode-outline CmApp-SubApps-primary_sec">
                                  <div className="CmApp-SubApps-sec_header">
                                    <div className="h4">Crop &amp; Resize</div>
                                    <div className="dropdown">
                                      <button
                                        aria-expanded="false"
                                        type="button"
                                        aria-haspopup="true"
                                        className="CmApp-Tools-tool dropdown-toggle CmApp-Tools-sticky_settings_button SettingsGroups-Crop-Mode-button btn-xs"
                                        data-toggle="dropdown"
                                        onClick={() => {
                                          this.setState({
                                            CropModeSettingsPopup: !this.state
                                              .CropModeSettingsPopup,
                                          });
                                        }}
                                      >
                                        <span>
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 20 20"
                                          >
                                            <path
                                              className="tool-dark"
                                              d="M10.91,19H9.09a.5.5,0,0,1-.48-.36l-.53-1.85-.23-.07a6.1,6.1,0,0,1-1.08-.47l-.21-.11-1.68.94A.47.47,0,0,1,4.29,17L3,15.72a.51.51,0,0,1-.08-.6l.93-1.68-.11-.21a7.07,7.07,0,0,1-.45-1.08l-.07-.23-1.85-.53A.5.5,0,0,1,1,10.91V9.07a.5.5,0,0,1,.36-.48l1.86-.53.07-.22a6.69,6.69,0,0,1,.44-1.08l.11-.22L2.9,4.87A.51.51,0,0,1,3,4.27L4.29,3a.5.5,0,0,1,.59-.08l1.68.94.21-.11a8.06,8.06,0,0,1,1.08-.47l.23-.07.53-1.83A.5.5,0,0,1,9.09,1h1.82a.5.5,0,0,1,.48.36l.53,1.83.23.07a8.06,8.06,0,0,1,1.08.47l.21.11,1.68-.94a.48.48,0,0,1,.59.08L17,4.27a.51.51,0,0,1,.09.6l-.94,1.67.11.22a6.69,6.69,0,0,1,.44,1.08l.07.22,1.86.53a.5.5,0,0,1,.36.48v1.84a.5.5,0,0,1-.36.48l-1.85.53-.07.23a7.07,7.07,0,0,1-.45,1.08l-.11.21.93,1.68a.51.51,0,0,1-.08.6L15.71,17a.47.47,0,0,1-.59.08l-1.68-.94-.21.11a6.1,6.1,0,0,1-1.08.47l-.23.07-.53,1.85A.51.51,0,0,1,10.91,19Z"
                                            ></path>
                                            <path
                                              className="tool-light"
                                              d="M9.47,18h1.06L11,16.26a.5.5,0,0,1,.32-.34l.48-.15a7,7,0,0,0,.93-.4l.45-.24a.51.51,0,0,1,.48,0l1.58.89.75-.75-.87-1.59a.47.47,0,0,1,0-.47l.23-.45a6.14,6.14,0,0,0,.39-.93l.15-.48a.5.5,0,0,1,.34-.32L18,10.53V9.45L16.25,9a.49.49,0,0,1-.34-.33l-.15-.47a6.8,6.8,0,0,0-.38-.93l-.23-.46a.47.47,0,0,1,0-.47L16,4.71,15.28,4l-1.58.88a.48.48,0,0,1-.48,0l-.45-.23a6.06,6.06,0,0,0-.93-.41l-.48-.15A.5.5,0,0,1,11,3.72L10.54,2H9.46L9,3.72a.5.5,0,0,1-.32.34l-.48.15a6.06,6.06,0,0,0-.93.41l-.45.23a.48.48,0,0,1-.48,0L4.72,4,4,4.71l.89,1.58a.51.51,0,0,1,0,.48l-.23.45a6.8,6.8,0,0,0-.38.93l-.15.47A.49.49,0,0,1,3.75,9L2,9.45v1.08L3.74,11a.5.5,0,0,1,.34.32l.15.48a5.74,5.74,0,0,0,.39.93l.23.45a.47.47,0,0,1,0,.47L4,15.28l.75.75,1.58-.89a.51.51,0,0,1,.48,0l.45.24a7,7,0,0,0,.93.4l.48.15a.5.5,0,0,1,.32.34Z"
                                            ></path>
                                            <path
                                              className="tool-dark"
                                              d="M10.05,12.83a2.74,2.74,0,1,1,2.74-2.74A2.74,2.74,0,0,1,10.05,12.83Z"
                                            ></path>
                                            <path
                                              className="tool-white"
                                              d="M10.05,8.36a1.74,1.74,0,1,0,1.74,1.73A1.74,1.74,0,0,0,10.05,8.36Z"
                                            ></path>
                                          </svg>
                                        </span>
                                      </button>

                                      {this.state.CropModeSettingsPopup ? (
                                        <ul className="dropdown-menu modern_menu dropdown-menu-right">
                                          <li className="disabled bg-warning">
                                            <a
                                              href="#"
                                              className="i"
                                              style={{ whiteSpace: "normal" }}
                                            >
                                              Please log in or create an account
                                              to use the default settings
                                              feature.{" "}
                                            </a>
                                          </li>
                                          <li
                                            role="separator"
                                            className="divider"
                                          ></li>
                                          <li className="CmApp-StickySettings-set disabled">
                                            <a className="SettingsGroups-Crop-Mode-setStickyToCurrent disabled">
                                              <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 15 15"
                                              >
                                                <path
                                                  className="tool-dark"
                                                  d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                                ></path>
                                                <path
                                                  className="tool-light"
                                                  d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                                ></path>
                                              </svg>
                                              <span className="CmApp-StickySettings-enabled">
                                                Set as new default
                                              </span>
                                              <span className="CmApp-StickySettings-disabled">
                                                Using Default
                                              </span>
                                            </a>
                                          </li>

                                          <li className="CmApp-StickySettings-reset disabled">
                                            <a className="SettingsGroups-Crop-Mode-setCurrentToDefault disabled">
                                              <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 15 15"
                                              >
                                                <circle
                                                  className="tool-light"
                                                  cx="8.5"
                                                  cy="7.5"
                                                  r="1.5"
                                                ></circle>
                                                <path
                                                  className="tool-dark"
                                                  d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                                ></path>
                                              </svg>
                                              <span>Reset to default</span>
                                            </a>
                                          </li>
                                          <li
                                            role="separator"
                                            className="divider"
                                          ></li>
                                          <li className="CmApp-StickySettings-factory disabled">
                                            <a className="SettingsGroups-Crop-Mode-setCurrentAndStickyToFactory disabled">
                                              <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 15 15"
                                              >
                                                <path
                                                  className="tool-dark"
                                                  d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                                ></path>
                                                <circle
                                                  className="tool-light"
                                                  cx="8.53"
                                                  cy="7.5"
                                                  r="1.5"
                                                ></circle>
                                              </svg>
                                              <span>
                                                Restore factory default
                                              </span>
                                            </a>
                                          </li>
                                          <li
                                            role="separator"
                                            className="divider"
                                          ></li>
                                          <li className="">
                                            <a className="sticky_settings">
                                              <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 15 15"
                                              >
                                                <rect
                                                  className="tool-dark"
                                                  x="5.83"
                                                  y="2.87"
                                                  width="7.99"
                                                  height="1.33"
                                                  transform="translate(19.66 7.08) rotate(180)"
                                                ></rect>
                                                <rect
                                                  className="tool-dark"
                                                  x="5.83"
                                                  y="6.87"
                                                  width="7.99"
                                                  height="1.33"
                                                  transform="translate(19.66 15.07) rotate(180)"
                                                ></rect>
                                                <rect
                                                  className="tool-dark"
                                                  x="5.83"
                                                  y="10.87"
                                                  width="7.99"
                                                  height="1.33"
                                                  transform="translate(19.66 23.07) rotate(180)"
                                                ></rect>
                                                <circle
                                                  className="tool-light"
                                                  cx="2.47"
                                                  cy="7.5"
                                                  r="1.33"
                                                ></circle>
                                                <circle
                                                  className="tool-light"
                                                  cx="2.47"
                                                  cy="3.48"
                                                  r="1.33"
                                                ></circle>
                                                <circle
                                                  className="tool-light"
                                                  cx="2.47"
                                                  cy="11.53"
                                                  r="1.33"
                                                ></circle>
                                              </svg>
                                              <span>Show all defaults</span>
                                            </a>
                                          </li>
                                        </ul>
                                      ) : null}
                                    </div>
                                  </div>
                                  <div className="CmApp-SubApps-radio_group">
                                    <label
                                      className="CmApp-SubApps-radio"
                                      style={{ marginTop: 0 }}
                                    >
                                      <input
                                        type="radio"
                                        value="CmApp-CropApp-Mode-Unconstrained"
                                        name="CmApp-CropApp-Mode-group"
                                        className="CmApp-CropApp-Mode-Unconstrained"
                                      />
                                      <div>
                                        <span>Unconstrained</span>
                                      </div>
                                    </label>

                                    <label className="CmApp-SubApps-radio">
                                      <input
                                        type="radio"
                                        value="CmApp-CropApp-Mode-LockedAspectRatio"
                                        name="CmApp-CropApp-Mode-group"
                                        className="CmApp-CropApp-Mode-LockedAspectRatio"
                                      />
                                      <div>
                                        <span>Aspect Ratio: </span>
                                        <div className="dropdown">
                                          <button
                                            className="app_bttn app_bttn_dark"
                                            data-toggle="dropdown"
                                          >
                                            <span className="CmApp-CropApp-locked_aspect_ratio_display">
                                              4:3
                                            </span>
                                            <i className="Icons-down_carrot"></i>
                                          </button>
                                          <ul
                                            className="dropdown-menu dropdown-menu-right modern_menu hidden"
                                            id="CmApp-CropApp-AspectRatio-List"
                                          >
                                            <li>
                                              <a href="#">Hello</a>
                                            </li>
                                          </ul>
                                        </div>
                                      </div>
                                    </label>

                                    <label
                                      className="CmApp-SubApps-radio"
                                      style={{ marginBottom: 0 }}
                                    >
                                      <input
                                        type="radio"
                                        value="CmApp-CropApp-Mode-TargetSize"
                                        name="CmApp-CropApp-Mode-group"
                                        className="CmApp-CropApp-Mode-TargetSize"
                                      />
                                      <div>
                                        <span>Target Size: </span>
                                        <div className="dropdown">
                                          <button
                                            className="app_bttn app_bttn_dark"
                                            data-toggle="dropdown"
                                          >
                                            <span className="CmApp-CropApp-target_size_display">
                                              1200 x 800
                                            </span>
                                            <i className="Icons-down_carrot"></i>
                                          </button>
                                          <ul
                                            className="dropdown-menu dropdown-menu-right modern_menu hidden"
                                            id="CmApp-CropApp-TargetSize-List"
                                          >
                                            <li>
                                              <a href="#">Hello</a>
                                            </li>
                                          </ul>
                                        </div>
                                        <div className="CmApp-SubApps-radio_checkbox_container">
                                          <div className="checkboxX CmApp-SubApps-radio_checkbox">
                                            <label>
                                              <input
                                                type="checkbox"
                                                className="CmApp-CropApp-allow_enlarging_result"
                                              />{" "}
                                              Allow Enlarging Result
                                            </label>
                                          </div>
                                        </div>
                                      </div>
                                    </label>
                                  </div>
                                </div>
                                <hr />
                              </div>
                              <div className="CmApp-CropApp-FitToResult-container">
                                <div className="CmApp-SubApps-checkbox_sec SettingsGroups-Crop-FitToResult-outline sticky_outline">
                                  <div className="CmApp-SubApps-sec_header">
                                    <label className="CmApp-SubApps-checkbox">
                                      <input
                                        type="checkbox"
                                        id="CmApp-CropApp-FitToResultButton"
                                      />
                                      <span>Fit To Result</span>
                                    </label>
                                    <div className="dropdown">
                                      <button
                                        aria-expanded="false"
                                        type="button"
                                        aria-haspopup="true"
                                        className="CmApp-Tools-tool dropdown-toggle CmApp-Tools-sticky_settings_button SettingsGroups-Crop-FitToResult-button btn-xs"
                                        data-toggle="dropdown"
                                      >
                                        <span>
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 20 20"
                                          >
                                            <path
                                              className="tool-dark"
                                              d="M10.91,19H9.09a.5.5,0,0,1-.48-.36l-.53-1.85-.23-.07a6.1,6.1,0,0,1-1.08-.47l-.21-.11-1.68.94A.47.47,0,0,1,4.29,17L3,15.72a.51.51,0,0,1-.08-.6l.93-1.68-.11-.21a7.07,7.07,0,0,1-.45-1.08l-.07-.23-1.85-.53A.5.5,0,0,1,1,10.91V9.07a.5.5,0,0,1,.36-.48l1.86-.53.07-.22a6.69,6.69,0,0,1,.44-1.08l.11-.22L2.9,4.87A.51.51,0,0,1,3,4.27L4.29,3a.5.5,0,0,1,.59-.08l1.68.94.21-.11a8.06,8.06,0,0,1,1.08-.47l.23-.07.53-1.83A.5.5,0,0,1,9.09,1h1.82a.5.5,0,0,1,.48.36l.53,1.83.23.07a8.06,8.06,0,0,1,1.08.47l.21.11,1.68-.94a.48.48,0,0,1,.59.08L17,4.27a.51.51,0,0,1,.09.6l-.94,1.67.11.22a6.69,6.69,0,0,1,.44,1.08l.07.22,1.86.53a.5.5,0,0,1,.36.48v1.84a.5.5,0,0,1-.36.48l-1.85.53-.07.23a7.07,7.07,0,0,1-.45,1.08l-.11.21.93,1.68a.51.51,0,0,1-.08.6L15.71,17a.47.47,0,0,1-.59.08l-1.68-.94-.21.11a6.1,6.1,0,0,1-1.08.47l-.23.07-.53,1.85A.51.51,0,0,1,10.91,19Z"
                                            ></path>
                                            <path
                                              className="tool-light"
                                              d="M9.47,18h1.06L11,16.26a.5.5,0,0,1,.32-.34l.48-.15a7,7,0,0,0,.93-.4l.45-.24a.51.51,0,0,1,.48,0l1.58.89.75-.75-.87-1.59a.47.47,0,0,1,0-.47l.23-.45a6.14,6.14,0,0,0,.39-.93l.15-.48a.5.5,0,0,1,.34-.32L18,10.53V9.45L16.25,9a.49.49,0,0,1-.34-.33l-.15-.47a6.8,6.8,0,0,0-.38-.93l-.23-.46a.47.47,0,0,1,0-.47L16,4.71,15.28,4l-1.58.88a.48.48,0,0,1-.48,0l-.45-.23a6.06,6.06,0,0,0-.93-.41l-.48-.15A.5.5,0,0,1,11,3.72L10.54,2H9.46L9,3.72a.5.5,0,0,1-.32.34l-.48.15a6.06,6.06,0,0,0-.93.41l-.45.23a.48.48,0,0,1-.48,0L4.72,4,4,4.71l.89,1.58a.51.51,0,0,1,0,.48l-.23.45a6.8,6.8,0,0,0-.38.93l-.15.47A.49.49,0,0,1,3.75,9L2,9.45v1.08L3.74,11a.5.5,0,0,1,.34.32l.15.48a5.74,5.74,0,0,0,.39.93l.23.45a.47.47,0,0,1,0,.47L4,15.28l.75.75,1.58-.89a.51.51,0,0,1,.48,0l.45.24a7,7,0,0,0,.93.4l.48.15a.5.5,0,0,1,.32.34Z"
                                            ></path>
                                            <path
                                              className="tool-dark"
                                              d="M10.05,12.83a2.74,2.74,0,1,1,2.74-2.74A2.74,2.74,0,0,1,10.05,12.83Z"
                                            ></path>
                                            <path
                                              className="tool-white"
                                              d="M10.05,8.36a1.74,1.74,0,1,0,1.74,1.73A1.74,1.74,0,0,0,10.05,8.36Z"
                                            ></path>
                                          </svg>
                                        </span>
                                      </button>
                                      <ul className="dropdown-menu modern_menu dropdown-menu-right hidden">
                                        <li className="disabled bg-warning">
                                          <a
                                            href="#"
                                            className="i"
                                            style={{ whiteSpace: "normal" }}
                                          >
                                            Please log in or create an account
                                            to use the default settings feature.{" "}
                                          </a>
                                        </li>
                                        <li
                                          role="separator"
                                          className="divider"
                                        ></li>
                                        <li className="CmApp-StickySettings-set disabled">
                                          <a className="SettingsGroups-Crop-FitToResult-setStickyToCurrent disabled">
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              viewBox="0 0 15 15"
                                            >
                                              <path
                                                className="tool-dark"
                                                d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                              ></path>
                                              <path
                                                className="tool-light"
                                                d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                              ></path>
                                            </svg>
                                            <span className="CmApp-StickySettings-enabled">
                                              Set as new default
                                            </span>
                                            <span className="CmApp-StickySettings-disabled">
                                              Using Default
                                            </span>
                                          </a>
                                        </li>

                                        <li className="CmApp-StickySettings-reset disabled">
                                          <a className="SettingsGroups-Crop-FitToResult-setCurrentToDefault disabled">
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              viewBox="0 0 15 15"
                                            >
                                              <circle
                                                className="tool-light"
                                                cx="8.5"
                                                cy="7.5"
                                                r="1.5"
                                              ></circle>
                                              <path
                                                className="tool-dark"
                                                d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                              ></path>
                                            </svg>
                                            <span>Reset to default</span>
                                          </a>
                                        </li>
                                        <li
                                          role="separator"
                                          className="divider"
                                        ></li>
                                        <li className="CmApp-StickySettings-factory disabled">
                                          <a className="SettingsGroups-Crop-FitToResult-setCurrentAndStickyToFactory disabled">
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              viewBox="0 0 15 15"
                                            >
                                              <path
                                                className="tool-dark"
                                                d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                              ></path>
                                              <circle
                                                className="tool-light"
                                                cx="8.53"
                                                cy="7.5"
                                                r="1.5"
                                              ></circle>
                                            </svg>
                                            <span>Restore factory default</span>
                                          </a>
                                        </li>
                                        <li
                                          role="separator"
                                          className="divider"
                                        ></li>
                                        <li className="">
                                          <a className="sticky_settings">
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              viewBox="0 0 15 15"
                                            >
                                              <rect
                                                className="tool-dark"
                                                x="5.83"
                                                y="2.87"
                                                width="7.99"
                                                height="1.33"
                                                transform="translate(19.66 7.08) rotate(180)"
                                              ></rect>
                                              <rect
                                                className="tool-dark"
                                                x="5.83"
                                                y="6.87"
                                                width="7.99"
                                                height="1.33"
                                                transform="translate(19.66 15.07) rotate(180)"
                                              ></rect>
                                              <rect
                                                className="tool-dark"
                                                x="5.83"
                                                y="10.87"
                                                width="7.99"
                                                height="1.33"
                                                transform="translate(19.66 23.07) rotate(180)"
                                              ></rect>
                                              <circle
                                                className="tool-light"
                                                cx="2.47"
                                                cy="7.5"
                                                r="1.33"
                                              ></circle>
                                              <circle
                                                className="tool-light"
                                                cx="2.47"
                                                cy="3.48"
                                                r="1.33"
                                              ></circle>
                                              <circle
                                                className="tool-light"
                                                cx="2.47"
                                                cy="11.53"
                                                r="1.33"
                                              ></circle>
                                            </svg>
                                            <span>Show all defaults</span>
                                          </a>
                                        </li>
                                      </ul>
                                    </div>
                                  </div>
                                  <div className="CmApp-CropApp-fit_to_result_controls">
                                    <table className="table table-condensed CmApp-SubApps-table">
                                      <tbody>
                                        <tr
                                          className="CmApp-CropApp-PaddingPercent-container CmApp-SubApps-unit_row"
                                          style={{ backgroundColor: "#fff" }}
                                        >
                                          <td>Margin:</td>
                                          <td>
                                            <span className="CmApp-CropApp-PaddingPercent-display">
                                              0
                                            </span>
                                          </td>
                                          <td>
                                            <div
                                              style={{ display: "inline-flex" }}
                                            >
                                              <div className="app_bttn_group">
                                                <button
                                                  title="Thinner"
                                                  className="app_bttn  app_bttn_dark CmApp-CropApp-PaddingPercent-decrease"
                                                  alt="Thinner"
                                                  id="CmApp-CropApp-PaddingPercent-decrease"
                                                >
                                                  <span>-</span>
                                                </button>
                                                <button
                                                  title="Fatter"
                                                  className="app_bttn  app_bttn_dark CmApp-CropApp-PaddingPercent-increase"
                                                  alt="Fatter"
                                                  id="CmApp-CropApp-PaddingPercent-increase"
                                                >
                                                  <span>+</span>
                                                </button>
                                              </div>
                                              <div className="app_bttn_group">
                                                <button
                                                  title="Reset"
                                                  className="disabled app_bttn  app_bttn_dark CmApp-CropApp-PaddingPercent-reset"
                                                  alt="Reset"
                                                  id="CmApp-CropApp-PaddingPercent-reset"
                                                >
                                                  <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 20 20"
                                                  >
                                                    <path
                                                      className="tool-dark"
                                                      d="M11.13,5H4.59L6.74,2.85,6,2.15l-3,3a.5.5,0,0,0,0,.7l3,3,.71-.7L4.59,6h6.54A4.84,4.84,0,0,1,16,10.84v.32A4.84,4.84,0,0,1,11.13,16H3.88v1h7.25A5.85,5.85,0,0,0,17,11.16v-.32A5.85,5.85,0,0,0,11.13,5Z"
                                                    ></path>
                                                  </svg>
                                                </button>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>

                                        <tr className="CmApp-CropApp-PaddingPixels-container CmApp-SubApps-unit_row">
                                          <td>Margin:</td>
                                          <td>
                                            <span className="CmApp-CropApp-PaddingPixels-display">
                                              0
                                            </span>
                                          </td>
                                          <td>
                                            <div
                                              style={{ display: "inline-flex" }}
                                            >
                                              <div className="app_bttn_group">
                                                <button
                                                  title="Thinner"
                                                  className="app_bttn  app_bttn_dark CmApp-CropApp-PaddingPixels-decrease"
                                                  alt="Thinner"
                                                  id="CmApp-CropApp-PaddingPixels-decrease"
                                                >
                                                  <span>-</span>
                                                </button>
                                                <button
                                                  title="Fatter"
                                                  className="app_bttn  app_bttn_dark CmApp-CropApp-PaddingPixels-increase"
                                                  alt="Fatter"
                                                  id="CmApp-CropApp-PaddingPixels-increase"
                                                >
                                                  <span>+</span>
                                                </button>
                                              </div>
                                              <div className="app_bttn_group">
                                                <button
                                                  title="Reset"
                                                  className="disabled app_bttn  app_bttn_dark CmApp-CropApp-PaddingPixels-reset"
                                                  alt="Reset"
                                                  id="CmApp-CropApp-PaddingPixels-reset"
                                                >
                                                  <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 20 20"
                                                  >
                                                    <path
                                                      className="tool-dark"
                                                      d="M11.13,5H4.59L6.74,2.85,6,2.15l-3,3a.5.5,0,0,0,0,.7l3,3,.71-.7L4.59,6h6.54A4.84,4.84,0,0,1,16,10.84v.32A4.84,4.84,0,0,1,11.13,16H3.88v1h7.25A5.85,5.85,0,0,0,17,11.16v-.32A5.85,5.85,0,0,0,11.13,5Z"
                                                    ></path>
                                                  </svg>
                                                </button>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>

                                        <tr>
                                          <td>Units:</td>
                                          <td colspan="2">
                                            <div
                                              className="CmApp-CropApp-MarginUnits-group app_radio_button_group"
                                              data-toggle="buttons"
                                            >
                                              <label className="CmApp-CropApp-MarginUnits-Pixels app_radio_buttons">
                                                <input
                                                  type="radio"
                                                  checked="true"
                                                  value="CmApp-CropApp-MarginUnits-Pixels"
                                                  name="CmApp-CropApp-MarginUnits-group"
                                                  autocomplete="off"
                                                />
                                                Pixels
                                              </label>
                                              <label className="CmApp-CropApp-MarginUnits-Percent app_radio_buttons">
                                                <input
                                                  type="radio"
                                                  value="CmApp-CropApp-MarginUnits-Percent"
                                                  name="CmApp-CropApp-MarginUnits-group"
                                                  autocomplete="off"
                                                />
                                                Percent
                                              </label>
                                            </div>
                                          </td>
                                        </tr>

                                        <tr>
                                          <td>Object Size:</td>
                                          <td colspan="2">
                                            <div
                                              className="CmApp-CropApp-ObjectSize-group app_radio_button_group"
                                              data-toggle="buttons"
                                            >
                                              <label className="CmApp-CropApp-ObjectSize-Small app_radio_buttons">
                                                <input
                                                  type="radio"
                                                  value="CmApp-CropApp-ObjectSize-Small"
                                                  name="CmApp-CropApp-ObjectSize-group"
                                                  autocomplete="off"
                                                />
                                                Small
                                              </label>
                                              <label className="CmApp-CropApp-ObjectSize-Medium app_radio_buttons">
                                                <input
                                                  type="radio"
                                                  value="CmApp-CropApp-ObjectSize-Medium"
                                                  name="CmApp-CropApp-ObjectSize-group"
                                                  autocomplete="off"
                                                />
                                                Medium
                                              </label>
                                              <label className="CmApp-CropApp-ObjectSize-Large app_radio_buttons">
                                                <input
                                                  type="radio"
                                                  checked="true"
                                                  value="CmApp-CropApp-ObjectSize-Large"
                                                  name="CmApp-CropApp-ObjectSize-group"
                                                  autocomplete="off"
                                                />
                                                Large
                                              </label>
                                            </div>
                                          </td>
                                        </tr>

                                        <tr>
                                          <td>Alignment:</td>
                                          <td colspan="2">
                                            <div
                                              className="CmApp-CropApp-VerticalAlignment-group app_radio_button_group"
                                              data-toggle="buttons"
                                            >
                                              <label className="CmApp-CropApp-VerticalAlignment-Top app_radio_buttons">
                                                <input
                                                  type="radio"
                                                  value="CmApp-CropApp-VerticalAlignment-Top"
                                                  name="CmApp-CropApp-VerticalAlignment-group"
                                                  autocomplete="off"
                                                />
                                                Top
                                              </label>
                                              <label className="CmApp-CropApp-VerticalAlignment-Middle app_radio_buttons">
                                                <input
                                                  type="radio"
                                                  checked="true"
                                                  value="CmApp-CropApp-VerticalAlignment-Middle"
                                                  name="CmApp-CropApp-VerticalAlignment-group"
                                                  autocomplete="off"
                                                />
                                                Middle
                                              </label>
                                              <label className="CmApp-CropApp-VerticalAlignment-Bottom app_radio_buttons">
                                                <input
                                                  type="radio"
                                                  value="CmApp-CropApp-VerticalAlignment-Bottom"
                                                  name="CmApp-CropApp-VerticalAlignment-group"
                                                  autocomplete="off"
                                                />
                                                Bottom
                                              </label>
                                            </div>
                                          </td>
                                        </tr>

                                        <tr>
                                          <td>Shadows:</td>
                                          <td colspan="2">
                                            <div
                                              className="CmApp-CropApp-Shadows-group app_radio_button_group"
                                              data-toggle="buttons"
                                            >
                                              <label className="CmApp-CropApp-Shadows-Ignore app_radio_buttons">
                                                <input
                                                  type="radio"
                                                  value="CmApp-CropApp-Shadows-Ignore"
                                                  name="CmApp-CropApp-Shadows-group"
                                                  autocomplete="off"
                                                />
                                                Ignore
                                              </label>
                                              <label className="CmApp-CropApp-Shadows-Pad app_radio_buttons">
                                                <input
                                                  type="radio"
                                                  checked="true"
                                                  value="CmApp-CropApp-Shadows-Pad"
                                                  name="CmApp-CropApp-Shadows-group"
                                                  autocomplete="off"
                                                />
                                                Pad
                                              </label>
                                              <label className="CmApp-CropApp-Shadows-Tight app_radio_buttons">
                                                <input
                                                  type="radio"
                                                  value="CmApp-CropApp-Shadows-Tight"
                                                  name="CmApp-CropApp-Shadows-group"
                                                  autocomplete="off"
                                                />
                                                Tight
                                              </label>
                                            </div>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                                <div className="CmApp-SubApps-sec_body">
                                  <p className="comment CmApp-CropApp-fit_to_result_comment">
                                    Always use Fit To Result when cropping to
                                    ensure centered and consistent results.{" "}
                                  </p>
                                </div>
                                <hr />
                              </div>
                              <div className="CmApp-CropApp-Rotate-container">
                                <div className="CmApp-SubApps-primary_sec">
                                  <div className="CmApp-SubApps-sec_header">
                                    <p className="h4">Rotate</p>
                                  </div>
                                  <table className="table table-condensed CmApp-SubApps-table">
                                    <tbody>
                                      <tr className="CmApp-CropApp-RotateSpinner-container CmApp-SubApps-unit_row">
                                        <td>Rotate 90°:</td>
                                        <td>
                                          <span className="CmApp-CropApp-RotateSpinner-display">
                                            0°
                                          </span>
                                        </td>
                                        <td>
                                          <div
                                            style={{ display: "inline-flex" }}
                                          >
                                            <div className="app_bttn_group">
                                              <button
                                                title="Counterclockwise"
                                                className="app_bttn  app_bttn_dark CmApp-CropApp-RotateSpinner-decrease"
                                                alt="Counterclockwise"
                                                id="CmApp-CropApp-RotateSpinner-decrease"
                                              >
                                                <span>-</span>
                                              </button>
                                              <button
                                                title="Clockwise"
                                                className="app_bttn  app_bttn_dark CmApp-CropApp-RotateSpinner-increase"
                                                alt="Clockwise"
                                                id="CmApp-CropApp-RotateSpinner-increase"
                                              >
                                                <span>+</span>
                                              </button>
                                            </div>
                                            <div className="app_bttn_group">
                                              <button
                                                title="Reset"
                                                className="disabled app_bttn  app_bttn_dark CmApp-CropApp-RotateSpinner-reset"
                                                alt="Reset"
                                                id="CmApp-CropApp-RotateSpinner-reset"
                                              >
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  viewBox="0 0 20 20"
                                                >
                                                  <path
                                                    className="tool-dark"
                                                    d="M11.13,5H4.59L6.74,2.85,6,2.15l-3,3a.5.5,0,0,0,0,.7l3,3,.71-.7L4.59,6h6.54A4.84,4.84,0,0,1,16,10.84v.32A4.84,4.84,0,0,1,11.13,16H3.88v1h7.25A5.85,5.85,0,0,0,17,11.16v-.32A5.85,5.85,0,0,0,11.13,5Z"
                                                  ></path>
                                                </svg>
                                              </button>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>

                                      <tr className="CmApp-CropApp-StraightenSpinner-container CmApp-SubApps-unit_row">
                                        <td>Straighten:</td>
                                        <td>
                                          <span className="CmApp-CropApp-StraightenSpinner-display">
                                            0.0°
                                          </span>
                                        </td>
                                        <td>
                                          <div
                                            style={{ display: "inline-flex" }}
                                          >
                                            <div className="app_bttn_group">
                                              <button
                                                title="Counterclockwise"
                                                className="app_bttn  app_bttn_dark CmApp-CropApp-StraightenSpinner-decrease"
                                                alt="Counterclockwise"
                                                id="CmApp-CropApp-StraightenSpinner-decrease"
                                              >
                                                <span>-</span>
                                              </button>
                                              <button
                                                title="Clockwise"
                                                className="app_bttn  app_bttn_dark CmApp-CropApp-StraightenSpinner-increase"
                                                alt="Clockwise"
                                                id="CmApp-CropApp-StraightenSpinner-increase"
                                              >
                                                <span>+</span>
                                              </button>
                                            </div>
                                            <div className="app_bttn_group">
                                              <button
                                                title="Reset"
                                                className="disabled app_bttn  app_bttn_dark CmApp-CropApp-StraightenSpinner-reset"
                                                alt="Reset"
                                                id="CmApp-CropApp-StraightenSpinner-reset"
                                              >
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  viewBox="0 0 20 20"
                                                >
                                                  <path
                                                    className="tool-dark"
                                                    d="M11.13,5H4.59L6.74,2.85,6,2.15l-3,3a.5.5,0,0,0,0,.7l3,3,.71-.7L4.59,6h6.54A4.84,4.84,0,0,1,16,10.84v.32A4.84,4.84,0,0,1,11.13,16H3.88v1h7.25A5.85,5.85,0,0,0,17,11.16v-.32A5.85,5.85,0,0,0,11.13,5Z"
                                                  ></path>
                                                </svg>
                                              </button>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                                <hr />
                              </div>
                              <div className="CmApp-SubApps-sec_body">
                                <p className="h5">
                                  <span>Output: </span>
                                  <span
                                    className="CmApp-CropApp-output_size_display gray"
                                    style={{ fontWeight: "normal" }}
                                  ></span>
                                </p>
                              </div>
                              <hr style={{ marginTop: "18px" }} />
                              <div className="CmApp-SubApps-sec_footer">
                                <div></div>
                                <div className="pull-right">
                                  <div className="app_bttn_group">
                                    <button className="CmApp-CropApp-reset_button app_bttn app_bttn_white app_bttn_large">
                                      Reset
                                    </button>
                                  </div>
                                  <div className="app_bttn_group">
                                    <button className="CmApp-CropApp-close_button CmApp-SubApps-subAppCloseButton app_bttn app_bttn_dark app_bttn_large">
                                      Ok
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </SideTab>
                        <SideTab
                          name="Shadows"
                          img={
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                            >
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
                          }
                        >
                          <div
                            className="subapp_sidebar"
                            id="CmApp-ShadowApp-Sidebar"
                          >
                            <div className="scrollable">
                              <div className="CmApp-ShadowApp-EllipseShadow-container">
                                <div className="CmApp-SubApps-primary_sec">
                                  <div className="CmApp-SubApps-sec_header">
                                    <p className="h4">Oval Shadows</p>
                                  </div>
                                  <div className="CmApp-SubApps-sec_body">
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                      }}
                                    >
                                      <div
                                        className="tool-buttons-group CmApp-SecondaryBar-group"
                                        data-toggle="buttons"
                                      >
                                        <label
                                          title="Pan/Edit Shadows"
                                          className="tool-radio-button pan-tool CmApp-Tools-tool CmApp-Tools-tool_radio_button active"
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
                                                className="tool-dark"
                                                d="M9.49,18.18H8.25l-.83,0a.5.5,0,0,1-.49-.59,1.49,1.49,0,0,0-.06-.94c-.18-.15-.43-.38-.66-.61l-.54-.5-.91-1a7.75,7.75,0,0,1-.54-.84c-.21-.36-.47-.79-.8-1.28a6.14,6.14,0,0,0-.55-.65,5.34,5.34,0,0,1-.81-1,2.31,2.31,0,0,1-.23-1.79A1.76,1.76,0,0,1,3.77,7.72a2.57,2.57,0,0,1,1.56.68l.08.07c-.07-.19-.13-.35-.2-.51S5.08,7.64,5,7.48a7.57,7.57,0,0,0-.3-.74l-.21-.46A13.23,13.23,0,0,1,4,4.7,2,2,0,0,1,4.35,3a2,2,0,0,1,2-.54,2.58,2.58,0,0,1,1.21,1A4.78,4.78,0,0,1,8,4.38c0-.15,0-.31,0-.47s.07-.67.09-.82a1.74,1.74,0,0,1,1-1.39,2.29,2.29,0,0,1,1.87,0,1.67,1.67,0,0,1,1,1.39,2.12,2.12,0,0,1,.62-.44,1.9,1.9,0,0,1,2,.37,2.42,2.42,0,0,1,.64,1.5c0,.29,0,.62,0,.93,0,.13,0,.26,0,.37l0,0,.11-.18a2,2,0,0,1,.91-.77,1.46,1.46,0,0,1,1.14,0,1.67,1.67,0,0,1,.89.9,2.75,2.75,0,0,1,0,1.16l0,.22a9.22,9.22,0,0,1-.37,1.77c-.1.35-.22.91-.35,1.66l-.06.29c-.08.5-.22,1.26-.33,1.65A6.55,6.55,0,0,1,16.45,14a6.94,6.94,0,0,0-1.16,1.7,2.46,2.46,0,0,0-.08.65,2.18,2.18,0,0,0,0,.28,3.2,3.2,0,0,0,.1.8.49.49,0,0,1-.06.41.51.51,0,0,1-.35.22,6,6,0,0,1-1.43,0c-.62-.09-1.15-.93-1.35-1.27-.24.46-.79,1.22-1.36,1.29A11,11,0,0,1,9.49,18.18ZM8,17.16h.3c.91,0,1.86,0,2.36,0a3.49,3.49,0,0,0,.73-.92.89.89,0,0,1,1.58.05,2.56,2.56,0,0,0,.69.86,3.67,3.67,0,0,0,.59,0,3.37,3.37,0,0,1,0-.55v-.24a3.55,3.55,0,0,1,.1-.83,7.1,7.1,0,0,1,1.35-2.11,5.6,5.6,0,0,0,.58-1.26c.1-.34.23-1.09.31-1.54l.05-.3c.14-.79.27-1.36.37-1.72A9.54,9.54,0,0,0,17.32,7l0-.23a4.74,4.74,0,0,0,0-.7A.65.65,0,0,0,17,5.71a.43.43,0,0,0-.35,0,.93.93,0,0,0-.47.39l-.12.19a3.61,3.61,0,0,0-.29.48c-.12.24-.31.73-.36.86s-.17.46-.26.75a.54.54,0,0,1-.58.36c-.45-.08-.43-.54-.42-.71V7.35c0-.48,0-.9,0-1.53,0-.13,0-.29,0-.45a7.3,7.3,0,0,0,0-.81,1.39,1.39,0,0,0-.37-.89A1,1,0,0,0,13,3.52a1.06,1.06,0,0,0-.57.68,18,18,0,0,0-.28,3c0,.41,0,.76-.05.95a.5.5,0,0,1-.52.47c-.33,0-.44-.09-.48-.56h0v0c0-.23,0-.54,0-1V6.33c0-.49,0-1.09,0-2,0-.13-.08-1-.1-1.08-.06-.47-.26-.6-.41-.66a1.28,1.28,0,0,0-1.05,0,.74.74,0,0,0-.42.65c0,.12-.08.55-.08.67C9,5.11,9,6,9.05,7l0,1.21a.5.5,0,0,1-.45.51.51.51,0,0,1-.54-.4L8,7.81A10.88,10.88,0,0,0,7.4,5.58a7.42,7.42,0,0,0-.7-1.53A1.64,1.64,0,0,0,6,3.44a1,1,0,0,0-.84.19A1,1,0,0,0,5,4.47a10.36,10.36,0,0,0,.45,1.42l.19.44A8.14,8.14,0,0,1,6,7.15a3,3,0,0,0,.16.42,7.15,7.15,0,0,1,.33.89c.16.52.26.92.34,1.25l.09.38h0c0,.18.15.59-.24.78s-.64-.16-.75-.32l-.29-.4a3.07,3.07,0,0,0-.2-.27,9.78,9.78,0,0,0-.72-.72,1.65,1.65,0,0,0-1-.44.76.76,0,0,0-.9.54,1.4,1.4,0,0,0,.17,1,4.42,4.42,0,0,0,.67.83,9,9,0,0,1,.64.77c.34.5.61,1,.83,1.33a7.32,7.32,0,0,0,.44.71l.85.93c.11.1.32.29.52.49l.62.57A1.68,1.68,0,0,1,8,17.16Z"
                                              ></path>
                                              <path
                                                className="tool-light"
                                                d="M8,17.16h.3c.91,0,1.86,0,2.36,0a3.49,3.49,0,0,0,.73-.92.89.89,0,0,1,1.58.05,2.56,2.56,0,0,0,.69.86,3.67,3.67,0,0,0,.59,0,3.37,3.37,0,0,1,0-.55v-.24a3.55,3.55,0,0,1,.1-.83,7.1,7.1,0,0,1,1.35-2.11,5.6,5.6,0,0,0,.58-1.26c.1-.34.23-1.09.31-1.54l.05-.3c.14-.79.27-1.36.37-1.72A9.54,9.54,0,0,0,17.32,7l0-.23a4.74,4.74,0,0,0,0-.7A.65.65,0,0,0,17,5.71a.43.43,0,0,0-.35,0,.93.93,0,0,0-.47.39l-.12.19a3.61,3.61,0,0,0-.29.48c-.12.24-.31.73-.36.86s-.17.46-.26.75a.54.54,0,0,1-.58.36c-.45-.08-.43-.54-.42-.71V7.35c0-.48,0-.9,0-1.53,0-.13,0-.29,0-.45a7.3,7.3,0,0,0,0-.81,1.39,1.39,0,0,0-.37-.89A1,1,0,0,0,13,3.52a1.06,1.06,0,0,0-.57.68,18,18,0,0,0-.28,3c0,.41,0,.76-.05.95a.5.5,0,0,1-.52.47c-.33,0-.44-.09-.48-.56h0v0c0-.23,0-.54,0-1V6.33c0-.49,0-1.09,0-2,0-.13-.08-1-.1-1.08-.06-.47-.26-.6-.41-.66a1.28,1.28,0,0,0-1.05,0,.74.74,0,0,0-.42.65c0,.12-.08.55-.08.67C9,5.11,9,6,9.05,7l0,1.21a.5.5,0,0,1-.45.51.51.51,0,0,1-.54-.4L8,7.81A10.88,10.88,0,0,0,7.4,5.58a7.42,7.42,0,0,0-.7-1.53A1.64,1.64,0,0,0,6,3.44a1,1,0,0,0-.84.19A1,1,0,0,0,5,4.47a10.36,10.36,0,0,0,.45,1.42l.19.44A8.14,8.14,0,0,1,6,7.15a3,3,0,0,0,.16.42,7.15,7.15,0,0,1,.33.89c.16.52.26.92.34,1.25l.09.38h0c0,.18.15.59-.24.78s-.64-.16-.75-.32l-.29-.4a3.07,3.07,0,0,0-.2-.27,9.78,9.78,0,0,0-.72-.72,1.65,1.65,0,0,0-1-.44.76.76,0,0,0-.9.54,1.4,1.4,0,0,0,.17,1,4.42,4.42,0,0,0,.67.83,9,9,0,0,1,.64.77c.34.5.61,1,.83,1.33a7.32,7.32,0,0,0,.44.71l.85.93c.11.1.32.29.52.49l.62.57A1.68,1.68,0,0,1,8,17.16Z"
                                              ></path>
                                              <rect
                                                className="tool-dark"
                                                x="12.88"
                                                y="11"
                                                width="1"
                                                height="4"
                                              ></rect>
                                              <rect
                                                className="tool-dark"
                                                x="10.88"
                                                y="11"
                                                width="1"
                                                height="4"
                                                transform="translate(-0.05 0.05) rotate(-0.24)"
                                              ></rect>
                                              <rect
                                                className="tool-dark"
                                                x="8.9"
                                                y="11"
                                                width="1"
                                                height="4"
                                                transform="translate(-0.07 0.05) rotate(-0.31)"
                                              ></rect>
                                            </svg>
                                          </span>
                                        </label>

                                        <label
                                          title="Create Oval Shadow"
                                          className="tool-radio-button shadow-ellipse-tool CmApp-Tools-tool CmApp-Tools-tool_radio_button"
                                          id="shadow-ellipse-tool"
                                        >
                                          <input
                                            type="radio"
                                            value="app-radio-tool-shadow-ellipse-tool"
                                            name="app-radio-tool"
                                          />
                                          <span>
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              viewBox="0 0 20 20"
                                            >
                                              <ellipse
                                                className="tool-light"
                                                cx="10"
                                                cy="14.44"
                                                rx="9"
                                                ry="3.56"
                                              ></ellipse>
                                              <polygon
                                                className="tool-dark"
                                                points="5 9 6 9 6 6 9 6 9 5 6 5 6 2 5 2 5 5 2 5 2 6 5 6 5 9"
                                              ></polygon>
                                              <path
                                                className="tool-dark"
                                                d="M1.76,15.87l0,0h.08a5,5,0,0,0,1,.62H3c.15.08.31.15.48.22L3.85,16a5,5,0,0,1-1.42-.84Z"
                                              ></path>
                                              <path
                                                className="tool-dark"
                                                d="M6,11.25h-.1c-.57.12-1.1.26-1.59.41H4.24l-.15,0,.33,1a13.24,13.24,0,0,1,1.79-.48Z"
                                              ></path>
                                              <path
                                                className="tool-dark"
                                                d="M2.83,13.45l-.54-.84A2.63,2.63,0,0,0,1,14.11l1,.23A1.82,1.82,0,0,1,2.83,13.45Z"
                                              ></path>
                                              <path
                                                className="tool-dark"
                                                d="M5.37,17.49l.21.05H6l.09,0h0c.41.07.83.14,1.26.19l.12-1a17.11,17.11,0,0,1-1.86-.33Z"
                                              ></path>
                                              <path
                                                className="tool-dark"
                                                d="M17.86,14.81a3.14,3.14,0,0,1-1.18.91l.46.89.43-.24h0a3.64,3.64,0,0,0,1.09-1Z"
                                              ></path>
                                              <path
                                                className="tool-dark"
                                                d="M17.86,14.07l.82-.56a3.16,3.16,0,0,0-.87-.83h0a4.88,4.88,0,0,0-.64-.37l-.45.89A3.13,3.13,0,0,1,17.86,14.07Z"
                                              ></path>
                                              <path
                                                className="tool-dark"
                                                d="M11.27,11.92l.06-1-.33,0H8.9L8,11l.09,1c.62-.05,1.27-.08,1.91-.08C10.42,11.89,10.85,11.9,11.27,11.92Z"
                                              ></path>
                                              <path
                                                className="tool-dark"
                                                d="M13.17,16.76l.15,1q.59-.09,1.11-.21h.22l.63-.17-.28-1A13.36,13.36,0,0,1,13.17,16.76Z"
                                              ></path>
                                              <path
                                                className="tool-dark"
                                                d="M10,17H9.36l0,1h.93l1.07,0-.06-1C10.86,17,10.43,17,10,17Z"
                                              ></path>
                                              <path
                                                className="tool-dark"
                                                d="M15.27,11.56a17.09,17.09,0,0,0-1.95-.42l-.16,1a17.18,17.18,0,0,1,1.83.4Z"
                                              ></path>
                                            </svg>
                                          </span>
                                        </label>
                                      </div>
                                      <span
                                        className="comment"
                                        style={{ marginLeft: "10px" }}
                                      >
                                        Create new oval shadows
                                      </span>
                                    </div>
                                  </div>
                                  <div
                                    id="CmApp-ShadowApp-EllipseShadow-Container"
                                    style={{ display: "none" }}
                                  >
                                    <div className="SettingsGroups-Shadows-Ellipse-outline sticky_outline">
                                      <div
                                        className="CmApp-SubApps-sec_header"
                                        style={{
                                          marginBottom: 0,
                                          marginTop: "10px",
                                        }}
                                      >
                                        <p className="h5">Selected Shadow</p>
                                        <div className="dropdown">
                                          <button
                                            aria-expanded="false"
                                            type="button"
                                            aria-haspopup="true"
                                            className="CmApp-Tools-tool dropdown-toggle CmApp-Tools-sticky_settings_button SettingsGroups-Shadows-Ellipse-button btn-xs"
                                            data-toggle="dropdown"
                                          >
                                            <span>
                                              <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 20 20"
                                              >
                                                <path
                                                  className="tool-dark"
                                                  d="M10.91,19H9.09a.5.5,0,0,1-.48-.36l-.53-1.85-.23-.07a6.1,6.1,0,0,1-1.08-.47l-.21-.11-1.68.94A.47.47,0,0,1,4.29,17L3,15.72a.51.51,0,0,1-.08-.6l.93-1.68-.11-.21a7.07,7.07,0,0,1-.45-1.08l-.07-.23-1.85-.53A.5.5,0,0,1,1,10.91V9.07a.5.5,0,0,1,.36-.48l1.86-.53.07-.22a6.69,6.69,0,0,1,.44-1.08l.11-.22L2.9,4.87A.51.51,0,0,1,3,4.27L4.29,3a.5.5,0,0,1,.59-.08l1.68.94.21-.11a8.06,8.06,0,0,1,1.08-.47l.23-.07.53-1.83A.5.5,0,0,1,9.09,1h1.82a.5.5,0,0,1,.48.36l.53,1.83.23.07a8.06,8.06,0,0,1,1.08.47l.21.11,1.68-.94a.48.48,0,0,1,.59.08L17,4.27a.51.51,0,0,1,.09.6l-.94,1.67.11.22a6.69,6.69,0,0,1,.44,1.08l.07.22,1.86.53a.5.5,0,0,1,.36.48v1.84a.5.5,0,0,1-.36.48l-1.85.53-.07.23a7.07,7.07,0,0,1-.45,1.08l-.11.21.93,1.68a.51.51,0,0,1-.08.6L15.71,17a.47.47,0,0,1-.59.08l-1.68-.94-.21.11a6.1,6.1,0,0,1-1.08.47l-.23.07-.53,1.85A.51.51,0,0,1,10.91,19Z"
                                                ></path>
                                                <path
                                                  className="tool-light"
                                                  d="M9.47,18h1.06L11,16.26a.5.5,0,0,1,.32-.34l.48-.15a7,7,0,0,0,.93-.4l.45-.24a.51.51,0,0,1,.48,0l1.58.89.75-.75-.87-1.59a.47.47,0,0,1,0-.47l.23-.45a6.14,6.14,0,0,0,.39-.93l.15-.48a.5.5,0,0,1,.34-.32L18,10.53V9.45L16.25,9a.49.49,0,0,1-.34-.33l-.15-.47a6.8,6.8,0,0,0-.38-.93l-.23-.46a.47.47,0,0,1,0-.47L16,4.71,15.28,4l-1.58.88a.48.48,0,0,1-.48,0l-.45-.23a6.06,6.06,0,0,0-.93-.41l-.48-.15A.5.5,0,0,1,11,3.72L10.54,2H9.46L9,3.72a.5.5,0,0,1-.32.34l-.48.15a6.06,6.06,0,0,0-.93.41l-.45.23a.48.48,0,0,1-.48,0L4.72,4,4,4.71l.89,1.58a.51.51,0,0,1,0,.48l-.23.45a6.8,6.8,0,0,0-.38.93l-.15.47A.49.49,0,0,1,3.75,9L2,9.45v1.08L3.74,11a.5.5,0,0,1,.34.32l.15.48a5.74,5.74,0,0,0,.39.93l.23.45a.47.47,0,0,1,0,.47L4,15.28l.75.75,1.58-.89a.51.51,0,0,1,.48,0l.45.24a7,7,0,0,0,.93.4l.48.15a.5.5,0,0,1,.32.34Z"
                                                ></path>
                                                <path
                                                  className="tool-dark"
                                                  d="M10.05,12.83a2.74,2.74,0,1,1,2.74-2.74A2.74,2.74,0,0,1,10.05,12.83Z"
                                                ></path>
                                                <path
                                                  className="tool-white"
                                                  d="M10.05,8.36a1.74,1.74,0,1,0,1.74,1.73A1.74,1.74,0,0,0,10.05,8.36Z"
                                                ></path>
                                              </svg>
                                            </span>
                                          </button>
                                          <ul className="dropdown-menu modern_menu dropdown-menu-right">
                                            <li className="disabled bg-warning">
                                              <a
                                                href="#"
                                                className="i"
                                                style={{ whiteSpace: "normal" }}
                                              >
                                                Please log in or create an
                                                account to use the default
                                                settings feature.{" "}
                                              </a>
                                            </li>
                                            <li
                                              role="separator"
                                              className="divider"
                                            ></li>
                                            <li className="CmApp-StickySettings-set disabled">
                                              <a className="SettingsGroups-Shadows-Ellipse-setStickyToCurrent disabled">
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  viewBox="0 0 15 15"
                                                >
                                                  <path
                                                    className="tool-dark"
                                                    d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                                  ></path>
                                                  <path
                                                    className="tool-light"
                                                    d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                                  ></path>
                                                </svg>
                                                <span className="CmApp-StickySettings-enabled">
                                                  Set as new default
                                                </span>
                                                <span className="CmApp-StickySettings-disabled">
                                                  Using Default
                                                </span>
                                              </a>
                                            </li>

                                            <li className="CmApp-StickySettings-reset disabled">
                                              <a className="SettingsGroups-Shadows-Ellipse-setCurrentToDefault disabled">
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  viewBox="0 0 15 15"
                                                >
                                                  <circle
                                                    className="tool-light"
                                                    cx="8.5"
                                                    cy="7.5"
                                                    r="1.5"
                                                  ></circle>
                                                  <path
                                                    className="tool-dark"
                                                    d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                                  ></path>
                                                </svg>
                                                <span>Reset to default</span>
                                              </a>
                                            </li>
                                            <li
                                              role="separator"
                                              className="divider"
                                            ></li>
                                            <li className="CmApp-StickySettings-factory disabled">
                                              <a className="SettingsGroups-Shadows-Ellipse-setCurrentAndStickyToFactory disabled">
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  viewBox="0 0 15 15"
                                                >
                                                  <path
                                                    className="tool-dark"
                                                    d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                                  ></path>
                                                  <circle
                                                    className="tool-light"
                                                    cx="8.53"
                                                    cy="7.5"
                                                    r="1.5"
                                                  ></circle>
                                                </svg>
                                                <span>
                                                  Restore factory default
                                                </span>
                                              </a>
                                            </li>
                                            <li
                                              role="separator"
                                              className="divider"
                                            ></li>
                                            <li className="">
                                              <a className="sticky_settings">
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  viewBox="0 0 15 15"
                                                >
                                                  <rect
                                                    className="tool-dark"
                                                    x="5.83"
                                                    y="2.87"
                                                    width="7.99"
                                                    height="1.33"
                                                    transform="translate(19.66 7.08) rotate(180)"
                                                  ></rect>
                                                  <rect
                                                    className="tool-dark"
                                                    x="5.83"
                                                    y="6.87"
                                                    width="7.99"
                                                    height="1.33"
                                                    transform="translate(19.66 15.07) rotate(180)"
                                                  ></rect>
                                                  <rect
                                                    className="tool-dark"
                                                    x="5.83"
                                                    y="10.87"
                                                    width="7.99"
                                                    height="1.33"
                                                    transform="translate(19.66 23.07) rotate(180)"
                                                  ></rect>
                                                  <circle
                                                    className="tool-light"
                                                    cx="2.47"
                                                    cy="7.5"
                                                    r="1.33"
                                                  ></circle>
                                                  <circle
                                                    className="tool-light"
                                                    cx="2.47"
                                                    cy="3.48"
                                                    r="1.33"
                                                  ></circle>
                                                  <circle
                                                    className="tool-light"
                                                    cx="2.47"
                                                    cy="11.53"
                                                    r="1.33"
                                                  ></circle>
                                                </svg>
                                                <span>Show all defaults</span>
                                              </a>
                                            </li>
                                          </ul>
                                        </div>
                                      </div>
                                      <table className="table table-condensed CmApp-SubApps-table">
                                        <tbody>
                                          <tr className="CmApp-ShadowApp-EllipseShadow-Strength-container CmApp-SubApps-unit_row">
                                            <td>Opacity:</td>
                                            <td>
                                              <span className="CmApp-ShadowApp-EllipseShadow-Strength-display">
                                                0
                                              </span>
                                            </td>
                                            <td>
                                              <div
                                                style={{
                                                  display: "inline-flex",
                                                }}
                                              >
                                                <div className="app_bttn_group">
                                                  <button
                                                    title="More transparent"
                                                    className="app_bttn  app_bttn_dark CmApp-ShadowApp-EllipseShadow-Strength-decrease"
                                                    alt="More transparent"
                                                    id="CmApp-ShadowApp-EllipseShadow-Strength-decrease"
                                                  >
                                                    <span>-</span>
                                                  </button>
                                                  <button
                                                    title="More opaque"
                                                    className="app_bttn  app_bttn_dark CmApp-ShadowApp-EllipseShadow-Strength-increase"
                                                    alt="More opaque"
                                                    id="CmApp-ShadowApp-EllipseShadow-Strength-increase"
                                                  >
                                                    <span>+</span>
                                                  </button>
                                                </div>
                                                <div className="app_bttn_group">
                                                  <button
                                                    title="Reset"
                                                    className="disabled app_bttn  app_bttn_dark CmApp-ShadowApp-EllipseShadow-Strength-reset"
                                                    alt="Reset"
                                                    id="CmApp-ShadowApp-EllipseShadow-Strength-reset"
                                                  >
                                                    <svg
                                                      xmlns="http://www.w3.org/2000/svg"
                                                      viewBox="0 0 20 20"
                                                    >
                                                      <path
                                                        className="tool-dark"
                                                        d="M11.13,5H4.59L6.74,2.85,6,2.15l-3,3a.5.5,0,0,0,0,.7l3,3,.71-.7L4.59,6h6.54A4.84,4.84,0,0,1,16,10.84v.32A4.84,4.84,0,0,1,11.13,16H3.88v1h7.25A5.85,5.85,0,0,0,17,11.16v-.32A5.85,5.85,0,0,0,11.13,5Z"
                                                      ></path>
                                                    </svg>
                                                  </button>
                                                </div>
                                              </div>
                                            </td>
                                          </tr>

                                          <tr className="CmApp-ShadowApp-EllipseShadow-Core-container CmApp-SubApps-unit_row">
                                            <td>Core Size:</td>
                                            <td>
                                              <span className="CmApp-ShadowApp-EllipseShadow-Core-display">
                                                0
                                              </span>
                                            </td>
                                            <td>
                                              <div
                                                style={{
                                                  display: "inline-flex",
                                                }}
                                              >
                                                <div className="app_bttn_group">
                                                  <button
                                                    title="Smaller"
                                                    className="app_bttn  app_bttn_dark CmApp-ShadowApp-EllipseShadow-Core-decrease"
                                                    alt="Smaller"
                                                    id="CmApp-ShadowApp-EllipseShadow-Core-decrease"
                                                  >
                                                    <span>-</span>
                                                  </button>
                                                  <button
                                                    title="Bigger"
                                                    className="app_bttn  app_bttn_dark CmApp-ShadowApp-EllipseShadow-Core-increase"
                                                    alt="Bigger"
                                                    id="CmApp-ShadowApp-EllipseShadow-Core-increase"
                                                  >
                                                    <span>+</span>
                                                  </button>
                                                </div>
                                                <div className="app_bttn_group">
                                                  <button
                                                    title="Reset"
                                                    className="disabled app_bttn  app_bttn_dark CmApp-ShadowApp-EllipseShadow-Core-reset"
                                                    alt="Reset"
                                                    id="CmApp-ShadowApp-EllipseShadow-Core-reset"
                                                  >
                                                    <svg
                                                      xmlns="http://www.w3.org/2000/svg"
                                                      viewBox="0 0 20 20"
                                                    >
                                                      <path
                                                        className="tool-dark"
                                                        d="M11.13,5H4.59L6.74,2.85,6,2.15l-3,3a.5.5,0,0,0,0,.7l3,3,.71-.7L4.59,6h6.54A4.84,4.84,0,0,1,16,10.84v.32A4.84,4.84,0,0,1,11.13,16H3.88v1h7.25A5.85,5.85,0,0,0,17,11.16v-.32A5.85,5.85,0,0,0,11.13,5Z"
                                                      ></path>
                                                    </svg>
                                                  </button>
                                                </div>
                                              </div>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>
                                <hr />
                              </div>
                              <div className="CmApp-ShadowApp-DropShadow-container">
                                <div className="CmApp-SubApps-checkbox_sec">
                                  <div className="CmApp-SubApps-sec_header">
                                    <label className="CmApp-SubApps-checkbox">
                                      <input
                                        type="checkbox"
                                        id="CmApp-ShadowApp-DropShadow-Enabled"
                                      />
                                      <span>Drop Shadow</span>
                                    </label>
                                    <div className="dropdown">
                                      <button
                                        aria-expanded="false"
                                        type="button"
                                        aria-haspopup="true"
                                        className="CmApp-Tools-tool dropdown-toggle CmApp-Tools-sticky_settings_button SettingsGroups-Shadows-Drop-button btn-xs"
                                        data-toggle="dropdown"
                                      >
                                        <span>
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 20 20"
                                          >
                                            <path
                                              className="tool-dark"
                                              d="M10.91,19H9.09a.5.5,0,0,1-.48-.36l-.53-1.85-.23-.07a6.1,6.1,0,0,1-1.08-.47l-.21-.11-1.68.94A.47.47,0,0,1,4.29,17L3,15.72a.51.51,0,0,1-.08-.6l.93-1.68-.11-.21a7.07,7.07,0,0,1-.45-1.08l-.07-.23-1.85-.53A.5.5,0,0,1,1,10.91V9.07a.5.5,0,0,1,.36-.48l1.86-.53.07-.22a6.69,6.69,0,0,1,.44-1.08l.11-.22L2.9,4.87A.51.51,0,0,1,3,4.27L4.29,3a.5.5,0,0,1,.59-.08l1.68.94.21-.11a8.06,8.06,0,0,1,1.08-.47l.23-.07.53-1.83A.5.5,0,0,1,9.09,1h1.82a.5.5,0,0,1,.48.36l.53,1.83.23.07a8.06,8.06,0,0,1,1.08.47l.21.11,1.68-.94a.48.48,0,0,1,.59.08L17,4.27a.51.51,0,0,1,.09.6l-.94,1.67.11.22a6.69,6.69,0,0,1,.44,1.08l.07.22,1.86.53a.5.5,0,0,1,.36.48v1.84a.5.5,0,0,1-.36.48l-1.85.53-.07.23a7.07,7.07,0,0,1-.45,1.08l-.11.21.93,1.68a.51.51,0,0,1-.08.6L15.71,17a.47.47,0,0,1-.59.08l-1.68-.94-.21.11a6.1,6.1,0,0,1-1.08.47l-.23.07-.53,1.85A.51.51,0,0,1,10.91,19Z"
                                            ></path>
                                            <path
                                              className="tool-light"
                                              d="M9.47,18h1.06L11,16.26a.5.5,0,0,1,.32-.34l.48-.15a7,7,0,0,0,.93-.4l.45-.24a.51.51,0,0,1,.48,0l1.58.89.75-.75-.87-1.59a.47.47,0,0,1,0-.47l.23-.45a6.14,6.14,0,0,0,.39-.93l.15-.48a.5.5,0,0,1,.34-.32L18,10.53V9.45L16.25,9a.49.49,0,0,1-.34-.33l-.15-.47a6.8,6.8,0,0,0-.38-.93l-.23-.46a.47.47,0,0,1,0-.47L16,4.71,15.28,4l-1.58.88a.48.48,0,0,1-.48,0l-.45-.23a6.06,6.06,0,0,0-.93-.41l-.48-.15A.5.5,0,0,1,11,3.72L10.54,2H9.46L9,3.72a.5.5,0,0,1-.32.34l-.48.15a6.06,6.06,0,0,0-.93.41l-.45.23a.48.48,0,0,1-.48,0L4.72,4,4,4.71l.89,1.58a.51.51,0,0,1,0,.48l-.23.45a6.8,6.8,0,0,0-.38.93l-.15.47A.49.49,0,0,1,3.75,9L2,9.45v1.08L3.74,11a.5.5,0,0,1,.34.32l.15.48a5.74,5.74,0,0,0,.39.93l.23.45a.47.47,0,0,1,0,.47L4,15.28l.75.75,1.58-.89a.51.51,0,0,1,.48,0l.45.24a7,7,0,0,0,.93.4l.48.15a.5.5,0,0,1,.32.34Z"
                                            ></path>
                                            <path
                                              className="tool-dark"
                                              d="M10.05,12.83a2.74,2.74,0,1,1,2.74-2.74A2.74,2.74,0,0,1,10.05,12.83Z"
                                            ></path>
                                            <path
                                              className="tool-white"
                                              d="M10.05,8.36a1.74,1.74,0,1,0,1.74,1.73A1.74,1.74,0,0,0,10.05,8.36Z"
                                            ></path>
                                          </svg>
                                        </span>
                                      </button>
                                      <ul className="dropdown-menu modern_menu dropdown-menu-right hidden">
                                        <li className="disabled bg-warning">
                                          <a
                                            href="#"
                                            className="i"
                                            style={{ whiteSpace: "normal" }}
                                          >
                                            Please log in or create an account
                                            to use the default settings feature.{" "}
                                          </a>
                                        </li>
                                        <li
                                          role="separator"
                                          className="divider"
                                        ></li>
                                        <li className="CmApp-StickySettings-set disabled">
                                          <a className="SettingsGroups-Shadows-Drop-setStickyToCurrent disabled">
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              viewBox="0 0 15 15"
                                            >
                                              <path
                                                className="tool-dark"
                                                d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                              ></path>
                                              <path
                                                className="tool-light"
                                                d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                              ></path>
                                            </svg>
                                            <span className="CmApp-StickySettings-enabled">
                                              Set as new default
                                            </span>
                                            <span className="CmApp-StickySettings-disabled">
                                              Using Default
                                            </span>
                                          </a>
                                        </li>

                                        <li className="CmApp-StickySettings-reset disabled">
                                          <a className="SettingsGroups-Shadows-Drop-setCurrentToDefault disabled">
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              viewBox="0 0 15 15"
                                            >
                                              <circle
                                                className="tool-light"
                                                cx="8.5"
                                                cy="7.5"
                                                r="1.5"
                                              ></circle>
                                              <path
                                                className="tool-dark"
                                                d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                              ></path>
                                            </svg>
                                            <span>Reset to default</span>
                                          </a>
                                        </li>
                                        <li
                                          role="separator"
                                          className="divider"
                                        ></li>
                                        <li className="CmApp-StickySettings-factory disabled">
                                          <a className="SettingsGroups-Shadows-Drop-setCurrentAndStickyToFactory disabled">
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              viewBox="0 0 15 15"
                                            >
                                              <path
                                                className="tool-dark"
                                                d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                              ></path>
                                              <circle
                                                className="tool-light"
                                                cx="8.53"
                                                cy="7.5"
                                                r="1.5"
                                              ></circle>
                                            </svg>
                                            <span>Restore factory default</span>
                                          </a>
                                        </li>
                                        <li
                                          role="separator"
                                          className="divider"
                                        ></li>
                                        <li className="">
                                          <a className="sticky_settings">
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              viewBox="0 0 15 15"
                                            >
                                              <rect
                                                className="tool-dark"
                                                x="5.83"
                                                y="2.87"
                                                width="7.99"
                                                height="1.33"
                                                transform="translate(19.66 7.08) rotate(180)"
                                              ></rect>
                                              <rect
                                                className="tool-dark"
                                                x="5.83"
                                                y="6.87"
                                                width="7.99"
                                                height="1.33"
                                                transform="translate(19.66 15.07) rotate(180)"
                                              ></rect>
                                              <rect
                                                className="tool-dark"
                                                x="5.83"
                                                y="10.87"
                                                width="7.99"
                                                height="1.33"
                                                transform="translate(19.66 23.07) rotate(180)"
                                              ></rect>
                                              <circle
                                                className="tool-light"
                                                cx="2.47"
                                                cy="7.5"
                                                r="1.33"
                                              ></circle>
                                              <circle
                                                className="tool-light"
                                                cx="2.47"
                                                cy="3.48"
                                                r="1.33"
                                              ></circle>
                                              <circle
                                                className="tool-light"
                                                cx="2.47"
                                                cy="11.53"
                                                r="1.33"
                                              ></circle>
                                            </svg>
                                            <span>Show all defaults</span>
                                          </a>
                                        </li>
                                      </ul>
                                    </div>
                                  </div>
                                  <div
                                    className="CmApp-ShadowApp-DropShadow-controls"
                                    style={{ display: "none" }}
                                  >
                                    <table className="table table-condensed CmApp-SubApps-table">
                                      <tbody>
                                        <tr className="CmApp-SubApps-unit_row">
                                          <td>Clipping:</td>
                                          <td
                                            style={{
                                              wordBreak: "break-all",
                                              lineHeight: 1,
                                            }}
                                          >
                                            <span className="CmApp-ShadowApp-DropShadow-crop_enabled CmApp-ShadowApp-DropShadow-crop_enabled_display">
                                              Off
                                            </span>
                                          </td>
                                          <td
                                            style={{
                                              wordBreak: "break-all",
                                              lineHeight: 1,
                                            }}
                                          >
                                            <button
                                              className="CmApp-ShadowApp-DropShadow-crop_enabled app_bttn app_bttn_dark"
                                              id="CmApp-ShadowApp-DropShadow-CropEnabled"
                                            >
                                              Enable
                                            </button>
                                          </td>
                                        </tr>

                                        <tr className="CmApp-ShadowApp-DropShadow-Opacity-container CmApp-SubApps-unit_row">
                                          <td>Opacity:</td>
                                          <td>
                                            <span className="CmApp-ShadowApp-DropShadow-Opacity-display">
                                              75%
                                            </span>
                                          </td>
                                          <td>
                                            <div
                                              style={{ display: "inline-flex" }}
                                            >
                                              <div className="app_bttn_group">
                                                <button
                                                  title="More transparent"
                                                  className="app_bttn  app_bttn_dark CmApp-ShadowApp-DropShadow-Opacity-decrease"
                                                  alt="More transparent"
                                                  id="CmApp-ShadowApp-DropShadow-Opacity-decrease"
                                                >
                                                  <span>-</span>
                                                </button>
                                                <button
                                                  title="More opaque"
                                                  className="app_bttn  app_bttn_dark CmApp-ShadowApp-DropShadow-Opacity-increase"
                                                  alt="More opaque"
                                                  id="CmApp-ShadowApp-DropShadow-Opacity-increase"
                                                >
                                                  <span>+</span>
                                                </button>
                                              </div>
                                              <div className="app_bttn_group">
                                                <button
                                                  title="Reset"
                                                  className="disabled app_bttn  app_bttn_dark CmApp-ShadowApp-DropShadow-Opacity-reset"
                                                  alt="Reset"
                                                  id="CmApp-ShadowApp-DropShadow-Opacity-reset"
                                                >
                                                  <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 20 20"
                                                  >
                                                    <path
                                                      className="tool-dark"
                                                      d="M11.13,5H4.59L6.74,2.85,6,2.15l-3,3a.5.5,0,0,0,0,.7l3,3,.71-.7L4.59,6h6.54A4.84,4.84,0,0,1,16,10.84v.32A4.84,4.84,0,0,1,11.13,16H3.88v1h7.25A5.85,5.85,0,0,0,17,11.16v-.32A5.85,5.85,0,0,0,11.13,5Z"
                                                    ></path>
                                                  </svg>
                                                </button>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>

                                        <tr className="CmApp-ShadowApp-DropShadow-BlurRadius-container CmApp-SubApps-unit_row">
                                          <td>Blur Radius:</td>
                                          <td>
                                            <span className="CmApp-ShadowApp-DropShadow-BlurRadius-display">
                                              25px
                                            </span>
                                          </td>
                                          <td>
                                            <div
                                              style={{ display: "inline-flex" }}
                                            >
                                              <div className="app_bttn_group">
                                                <button
                                                  title="Less blur"
                                                  className="app_bttn  app_bttn_dark CmApp-ShadowApp-DropShadow-BlurRadius-decrease"
                                                  alt="Less blur"
                                                  id="CmApp-ShadowApp-DropShadow-BlurRadius-decrease"
                                                >
                                                  <span>-</span>
                                                </button>
                                                <button
                                                  title="More blur"
                                                  className="app_bttn  app_bttn_dark CmApp-ShadowApp-DropShadow-BlurRadius-increase"
                                                  alt="More blur"
                                                  id="CmApp-ShadowApp-DropShadow-BlurRadius-increase"
                                                >
                                                  <span>+</span>
                                                </button>
                                              </div>
                                              <div className="app_bttn_group">
                                                <button
                                                  title="Reset"
                                                  className="disabled app_bttn  app_bttn_dark CmApp-ShadowApp-DropShadow-BlurRadius-reset"
                                                  alt="Reset"
                                                  id="CmApp-ShadowApp-DropShadow-BlurRadius-reset"
                                                >
                                                  <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 20 20"
                                                  >
                                                    <path
                                                      className="tool-dark"
                                                      d="M11.13,5H4.59L6.74,2.85,6,2.15l-3,3a.5.5,0,0,0,0,.7l3,3,.71-.7L4.59,6h6.54A4.84,4.84,0,0,1,16,10.84v.32A4.84,4.84,0,0,1,11.13,16H3.88v1h7.25A5.85,5.85,0,0,0,17,11.16v-.32A5.85,5.85,0,0,0,11.13,5Z"
                                                    ></path>
                                                  </svg>
                                                </button>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                        <tr className="CmApp-SubApps-unit_row">
                                          <td>Offset:</td>
                                          <td
                                            title="X, Y offset in pixels"
                                            alt="X, Y offset in pixels"
                                          >
                                            <span className="CmApp-ShadowApp-DropShadow-offset_display">
                                              +30, +30
                                            </span>
                                          </td>
                                          <td>
                                            <div
                                              className="btn-group"
                                              style={{
                                                display: "inline-block",
                                                marginBottom: "-4px",
                                                marginRight: "3px",
                                              }}
                                            >
                                              <table className="CmApp-ShadowApp-DropShadow-ArrowControl-table">
                                                <tbody>
                                                  <tr>
                                                    <td></td>
                                                    <td className="CmApp-ShadowApp-DropShadow-ArrowControl-control CmApp-ShadowApp-DropShadow-ArrowControl-up">
                                                      <span className="yo-data-uri triangle-arrow-up-svg"></span>
                                                    </td>
                                                    <td></td>
                                                  </tr>
                                                  <tr>
                                                    <td className="CmApp-ShadowApp-DropShadow-ArrowControl-control CmApp-ShadowApp-DropShadow-ArrowControl-left">
                                                      <span className="yo-data-uri triangle-arrow-left-svg"></span>
                                                    </td>
                                                    <td className="CmApp-ShadowApp-DropShadow-ArrowControl-control CmApp-ShadowApp-DropShadow-ArrowControl-zero">
                                                      <span className="yo-data-uri circle-7-svg"></span>
                                                    </td>
                                                    <td className="CmApp-ShadowApp-DropShadow-ArrowControl-control CmApp-ShadowApp-DropShadow-ArrowControl-right">
                                                      <span className="yo-data-uri triangle-arrow-right-svg"></span>
                                                    </td>
                                                  </tr>
                                                  <tr>
                                                    <td></td>
                                                    <td className="CmApp-ShadowApp-DropShadow-ArrowControl-control CmApp-ShadowApp-DropShadow-ArrowControl-down">
                                                      <span className="yo-data-uri triangle-arrow-down-svg"></span>
                                                    </td>
                                                    <td></td>
                                                  </tr>
                                                </tbody>
                                              </table>
                                            </div>
                                            <div className="app_bttn_group">
                                              <button
                                                title="Shadow Down Left"
                                                className="app_bttn_skinny app_bttn  app_bttn_dark CmApp-ShadowApp-DropShadow-offset_down_left"
                                                alt="Shadow Down Left"
                                                id="CmApp-ShadowApp-DropShadow-offset_down_left"
                                              >
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  viewBox="0 0 8 8"
                                                >
                                                  <rect
                                                    className="tool-light"
                                                    y="2"
                                                    width="6"
                                                    height="6"
                                                  ></rect>
                                                  <rect
                                                    className="tool-dark"
                                                    x="2"
                                                    width="6"
                                                    height="6"
                                                  ></rect>
                                                </svg>
                                              </button>
                                              <button
                                                title="Shadow Straight Down"
                                                className="app_bttn_skinny app_bttn  app_bttn_dark CmApp-ShadowApp-DropShadow-offset_down"
                                                alt="Shadow Straight Down"
                                                id="CmApp-ShadowApp-DropShadow-offset_down"
                                              >
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  viewBox="0 0 6 8"
                                                >
                                                  <rect
                                                    className="tool-dark"
                                                    width="6"
                                                    height="6"
                                                  ></rect>
                                                  <rect
                                                    className="tool-light"
                                                    y="6"
                                                    width="6"
                                                    height="2"
                                                  ></rect>
                                                </svg>
                                              </button>
                                              <button
                                                title="Shadow Down Right"
                                                className="app_bttn_skinny app_bttn  app_bttn_dark CmApp-ShadowApp-DropShadow-offset_down_right"
                                                alt="Shadow Down Right"
                                                id="CmApp-ShadowApp-DropShadow-offset_down_right"
                                              >
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  viewBox="0 0 8 8"
                                                >
                                                  <rect
                                                    className="tool-light"
                                                    x="2"
                                                    y="2"
                                                    width="6"
                                                    height="6"
                                                  ></rect>
                                                  <rect
                                                    className="tool-dark"
                                                    width="6"
                                                    height="6"
                                                  ></rect>
                                                </svg>
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                                <hr style={{ marginTop: "8px" }} />
                              </div>
                              <div className="CmApp-ShadowApp-MirrorShadow-container">
                                <div className="SettingsGroups-Shadows-Mirror-outline sticky_outline CmApp-SubApps-checkbox_sec">
                                  <div className="CmApp-SubApps-sec_header">
                                    <label className="CmApp-SubApps-checkbox">
                                      <input
                                        type="checkbox"
                                        id="CmApp-ShadowApp-MirrorShadow-Enabled"
                                      />
                                      <span>Reflection</span>
                                    </label>
                                    <div className="dropdown">
                                      <button
                                        aria-expanded="false"
                                        type="button"
                                        aria-haspopup="true"
                                        className="CmApp-Tools-tool dropdown-toggle CmApp-Tools-sticky_settings_button SettingsGroups-Shadows-Mirror-button btn-xs"
                                        data-toggle="dropdown"
                                      >
                                        <span>
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 20 20"
                                          >
                                            <path
                                              className="tool-dark"
                                              d="M10.91,19H9.09a.5.5,0,0,1-.48-.36l-.53-1.85-.23-.07a6.1,6.1,0,0,1-1.08-.47l-.21-.11-1.68.94A.47.47,0,0,1,4.29,17L3,15.72a.51.51,0,0,1-.08-.6l.93-1.68-.11-.21a7.07,7.07,0,0,1-.45-1.08l-.07-.23-1.85-.53A.5.5,0,0,1,1,10.91V9.07a.5.5,0,0,1,.36-.48l1.86-.53.07-.22a6.69,6.69,0,0,1,.44-1.08l.11-.22L2.9,4.87A.51.51,0,0,1,3,4.27L4.29,3a.5.5,0,0,1,.59-.08l1.68.94.21-.11a8.06,8.06,0,0,1,1.08-.47l.23-.07.53-1.83A.5.5,0,0,1,9.09,1h1.82a.5.5,0,0,1,.48.36l.53,1.83.23.07a8.06,8.06,0,0,1,1.08.47l.21.11,1.68-.94a.48.48,0,0,1,.59.08L17,4.27a.51.51,0,0,1,.09.6l-.94,1.67.11.22a6.69,6.69,0,0,1,.44,1.08l.07.22,1.86.53a.5.5,0,0,1,.36.48v1.84a.5.5,0,0,1-.36.48l-1.85.53-.07.23a7.07,7.07,0,0,1-.45,1.08l-.11.21.93,1.68a.51.51,0,0,1-.08.6L15.71,17a.47.47,0,0,1-.59.08l-1.68-.94-.21.11a6.1,6.1,0,0,1-1.08.47l-.23.07-.53,1.85A.51.51,0,0,1,10.91,19Z"
                                            ></path>
                                            <path
                                              className="tool-light"
                                              d="M9.47,18h1.06L11,16.26a.5.5,0,0,1,.32-.34l.48-.15a7,7,0,0,0,.93-.4l.45-.24a.51.51,0,0,1,.48,0l1.58.89.75-.75-.87-1.59a.47.47,0,0,1,0-.47l.23-.45a6.14,6.14,0,0,0,.39-.93l.15-.48a.5.5,0,0,1,.34-.32L18,10.53V9.45L16.25,9a.49.49,0,0,1-.34-.33l-.15-.47a6.8,6.8,0,0,0-.38-.93l-.23-.46a.47.47,0,0,1,0-.47L16,4.71,15.28,4l-1.58.88a.48.48,0,0,1-.48,0l-.45-.23a6.06,6.06,0,0,0-.93-.41l-.48-.15A.5.5,0,0,1,11,3.72L10.54,2H9.46L9,3.72a.5.5,0,0,1-.32.34l-.48.15a6.06,6.06,0,0,0-.93.41l-.45.23a.48.48,0,0,1-.48,0L4.72,4,4,4.71l.89,1.58a.51.51,0,0,1,0,.48l-.23.45a6.8,6.8,0,0,0-.38.93l-.15.47A.49.49,0,0,1,3.75,9L2,9.45v1.08L3.74,11a.5.5,0,0,1,.34.32l.15.48a5.74,5.74,0,0,0,.39.93l.23.45a.47.47,0,0,1,0,.47L4,15.28l.75.75,1.58-.89a.51.51,0,0,1,.48,0l.45.24a7,7,0,0,0,.93.4l.48.15a.5.5,0,0,1,.32.34Z"
                                            ></path>
                                            <path
                                              className="tool-dark"
                                              d="M10.05,12.83a2.74,2.74,0,1,1,2.74-2.74A2.74,2.74,0,0,1,10.05,12.83Z"
                                            ></path>
                                            <path
                                              className="tool-white"
                                              d="M10.05,8.36a1.74,1.74,0,1,0,1.74,1.73A1.74,1.74,0,0,0,10.05,8.36Z"
                                            ></path>
                                          </svg>
                                        </span>
                                      </button>
                                      <ul className="dropdown-menu modern_menu dropdown-menu-right hidden">
                                        <li className="disabled bg-warning">
                                          <a
                                            href="#"
                                            className="i"
                                            style={{ whiteSpace: "normal" }}
                                          >
                                            Please log in or create an account
                                            to use the default settings feature.{" "}
                                          </a>
                                        </li>
                                        <li
                                          role="separator"
                                          className="divider"
                                        ></li>
                                        <li className="CmApp-StickySettings-set disabled">
                                          <a className="SettingsGroups-Shadows-Mirror-setStickyToCurrent disabled">
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              viewBox="0 0 15 15"
                                            >
                                              <path
                                                className="tool-dark"
                                                d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                              ></path>
                                              <path
                                                className="tool-light"
                                                d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                              ></path>
                                            </svg>
                                            <span className="CmApp-StickySettings-enabled">
                                              Set as new default
                                            </span>
                                            <span className="CmApp-StickySettings-disabled">
                                              Using Default
                                            </span>
                                          </a>
                                        </li>

                                        <li className="CmApp-StickySettings-reset disabled">
                                          <a className="SettingsGroups-Shadows-Mirror-setCurrentToDefault disabled">
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              viewBox="0 0 15 15"
                                            >
                                              <circle
                                                className="tool-light"
                                                cx="8.5"
                                                cy="7.5"
                                                r="1.5"
                                              ></circle>
                                              <path
                                                className="tool-dark"
                                                d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                              ></path>
                                            </svg>
                                            <span>Reset to default</span>
                                          </a>
                                        </li>
                                        <li
                                          role="separator"
                                          className="divider"
                                        ></li>
                                        <li className="CmApp-StickySettings-factory disabled">
                                          <a className="SettingsGroups-Shadows-Mirror-setCurrentAndStickyToFactory disabled">
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              viewBox="0 0 15 15"
                                            >
                                              <path
                                                className="tool-dark"
                                                d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                              ></path>
                                              <circle
                                                className="tool-light"
                                                cx="8.53"
                                                cy="7.5"
                                                r="1.5"
                                              ></circle>
                                            </svg>
                                            <span>Restore factory default</span>
                                          </a>
                                        </li>
                                        <li
                                          role="separator"
                                          className="divider"
                                        ></li>
                                        <li className="">
                                          <a className="sticky_settings">
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              viewBox="0 0 15 15"
                                            >
                                              <rect
                                                className="tool-dark"
                                                x="5.83"
                                                y="2.87"
                                                width="7.99"
                                                height="1.33"
                                                transform="translate(19.66 7.08) rotate(180)"
                                              ></rect>
                                              <rect
                                                className="tool-dark"
                                                x="5.83"
                                                y="6.87"
                                                width="7.99"
                                                height="1.33"
                                                transform="translate(19.66 15.07) rotate(180)"
                                              ></rect>
                                              <rect
                                                className="tool-dark"
                                                x="5.83"
                                                y="10.87"
                                                width="7.99"
                                                height="1.33"
                                                transform="translate(19.66 23.07) rotate(180)"
                                              ></rect>
                                              <circle
                                                className="tool-light"
                                                cx="2.47"
                                                cy="7.5"
                                                r="1.33"
                                              ></circle>
                                              <circle
                                                className="tool-light"
                                                cx="2.47"
                                                cy="3.48"
                                                r="1.33"
                                              ></circle>
                                              <circle
                                                className="tool-light"
                                                cx="2.47"
                                                cy="11.53"
                                                r="1.33"
                                              ></circle>
                                            </svg>
                                            <span>Show all defaults</span>
                                          </a>
                                        </li>
                                      </ul>
                                    </div>
                                  </div>
                                  <div
                                    className="CmApp-ShadowApp-MirrorShadow-controls"
                                    style={{ display: "none" }}
                                  >
                                    <table className="table table-condensed CmApp-SubApps-table">
                                      <tbody>
                                        <tr className="CmApp-ShadowApp-MirrorShadow-Opacity-container CmApp-SubApps-unit_row">
                                          <td>Opacity:</td>
                                          <td>
                                            <span className="CmApp-ShadowApp-MirrorShadow-Opacity-display">
                                              50%
                                            </span>
                                          </td>
                                          <td>
                                            <div
                                              style={{ display: "inline-flex" }}
                                            >
                                              <div className="app_bttn_group">
                                                <button
                                                  title="More transparent"
                                                  className="app_bttn  app_bttn_dark CmApp-ShadowApp-MirrorShadow-Opacity-decrease"
                                                  alt="More transparent"
                                                  id="CmApp-ShadowApp-MirrorShadow-Opacity-decrease"
                                                >
                                                  <span>-</span>
                                                </button>
                                                <button
                                                  title="More opaque"
                                                  className="app_bttn  app_bttn_dark CmApp-ShadowApp-MirrorShadow-Opacity-increase"
                                                  alt="More opaque"
                                                  id="CmApp-ShadowApp-MirrorShadow-Opacity-increase"
                                                >
                                                  <span>+</span>
                                                </button>
                                              </div>
                                              <div className="app_bttn_group">
                                                <button
                                                  title="Reset"
                                                  className="disabled app_bttn  app_bttn_dark CmApp-ShadowApp-MirrorShadow-Opacity-reset"
                                                  alt="Reset"
                                                  id="CmApp-ShadowApp-MirrorShadow-Opacity-reset"
                                                >
                                                  <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 20 20"
                                                  >
                                                    <path
                                                      className="tool-dark"
                                                      d="M11.13,5H4.59L6.74,2.85,6,2.15l-3,3a.5.5,0,0,0,0,.7l3,3,.71-.7L4.59,6h6.54A4.84,4.84,0,0,1,16,10.84v.32A4.84,4.84,0,0,1,11.13,16H3.88v1h7.25A5.85,5.85,0,0,0,17,11.16v-.32A5.85,5.85,0,0,0,11.13,5Z"
                                                    ></path>
                                                  </svg>
                                                </button>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>

                                        <tr className="CmApp-ShadowApp-MirrorShadow-Height-container CmApp-SubApps-unit_row">
                                          <td>Height:</td>
                                          <td>
                                            <span className="CmApp-ShadowApp-MirrorShadow-Height-display">
                                              200px
                                            </span>
                                          </td>
                                          <td>
                                            <div
                                              style={{ display: "inline-flex" }}
                                            >
                                              <div className="app_bttn_group">
                                                <button
                                                  title="Shorter"
                                                  className="app_bttn  app_bttn_dark CmApp-ShadowApp-MirrorShadow-Height-decrease"
                                                  alt="Shorter"
                                                  id="CmApp-ShadowApp-MirrorShadow-Height-decrease"
                                                >
                                                  <span>-</span>
                                                </button>
                                                <button
                                                  title="Taller"
                                                  className="app_bttn  app_bttn_dark CmApp-ShadowApp-MirrorShadow-Height-increase"
                                                  alt="Taller"
                                                  id="CmApp-ShadowApp-MirrorShadow-Height-increase"
                                                >
                                                  <span>+</span>
                                                </button>
                                              </div>
                                              <div className="app_bttn_group">
                                                <button
                                                  title="Reset"
                                                  className="disabled app_bttn  app_bttn_dark CmApp-ShadowApp-MirrorShadow-Height-reset"
                                                  alt="Reset"
                                                  id="CmApp-ShadowApp-MirrorShadow-Height-reset"
                                                >
                                                  <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 20 20"
                                                  >
                                                    <path
                                                      className="tool-dark"
                                                      d="M11.13,5H4.59L6.74,2.85,6,2.15l-3,3a.5.5,0,0,0,0,.7l3,3,.71-.7L4.59,6h6.54A4.84,4.84,0,0,1,16,10.84v.32A4.84,4.84,0,0,1,11.13,16H3.88v1h7.25A5.85,5.85,0,0,0,17,11.16v-.32A5.85,5.85,0,0,0,11.13,5Z"
                                                    ></path>
                                                  </svg>
                                                </button>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                                <hr style={{ marginTop: "8px" }} />
                              </div>
                              <div className="CmApp-ShadowApp-PerspectiveShadow-container">
                                <div className="SettingsGroups-Shadows-Perspective-outline sticky_outline CmApp-SubApps-checkbox_sec">
                                  <div className="CmApp-SubApps-sec_header">
                                    <label className="CmApp-SubApps-checkbox">
                                      <input
                                        type="checkbox"
                                        id="CmApp-ShadowApp-PerspectiveShadow-Enabled"
                                      />
                                      <span>Cast Shadow</span>
                                    </label>
                                    <div className="dropdown">
                                      <button
                                        aria-expanded="false"
                                        type="button"
                                        aria-haspopup="true"
                                        className="CmApp-Tools-tool dropdown-toggle CmApp-Tools-sticky_settings_button SettingsGroups-Shadows-Perspective-button btn-xs"
                                        data-toggle="dropdown"
                                      >
                                        <span>
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 20 20"
                                          >
                                            <path
                                              className="tool-dark"
                                              d="M10.91,19H9.09a.5.5,0,0,1-.48-.36l-.53-1.85-.23-.07a6.1,6.1,0,0,1-1.08-.47l-.21-.11-1.68.94A.47.47,0,0,1,4.29,17L3,15.72a.51.51,0,0,1-.08-.6l.93-1.68-.11-.21a7.07,7.07,0,0,1-.45-1.08l-.07-.23-1.85-.53A.5.5,0,0,1,1,10.91V9.07a.5.5,0,0,1,.36-.48l1.86-.53.07-.22a6.69,6.69,0,0,1,.44-1.08l.11-.22L2.9,4.87A.51.51,0,0,1,3,4.27L4.29,3a.5.5,0,0,1,.59-.08l1.68.94.21-.11a8.06,8.06,0,0,1,1.08-.47l.23-.07.53-1.83A.5.5,0,0,1,9.09,1h1.82a.5.5,0,0,1,.48.36l.53,1.83.23.07a8.06,8.06,0,0,1,1.08.47l.21.11,1.68-.94a.48.48,0,0,1,.59.08L17,4.27a.51.51,0,0,1,.09.6l-.94,1.67.11.22a6.69,6.69,0,0,1,.44,1.08l.07.22,1.86.53a.5.5,0,0,1,.36.48v1.84a.5.5,0,0,1-.36.48l-1.85.53-.07.23a7.07,7.07,0,0,1-.45,1.08l-.11.21.93,1.68a.51.51,0,0,1-.08.6L15.71,17a.47.47,0,0,1-.59.08l-1.68-.94-.21.11a6.1,6.1,0,0,1-1.08.47l-.23.07-.53,1.85A.51.51,0,0,1,10.91,19Z"
                                            ></path>
                                            <path
                                              className="tool-light"
                                              d="M9.47,18h1.06L11,16.26a.5.5,0,0,1,.32-.34l.48-.15a7,7,0,0,0,.93-.4l.45-.24a.51.51,0,0,1,.48,0l1.58.89.75-.75-.87-1.59a.47.47,0,0,1,0-.47l.23-.45a6.14,6.14,0,0,0,.39-.93l.15-.48a.5.5,0,0,1,.34-.32L18,10.53V9.45L16.25,9a.49.49,0,0,1-.34-.33l-.15-.47a6.8,6.8,0,0,0-.38-.93l-.23-.46a.47.47,0,0,1,0-.47L16,4.71,15.28,4l-1.58.88a.48.48,0,0,1-.48,0l-.45-.23a6.06,6.06,0,0,0-.93-.41l-.48-.15A.5.5,0,0,1,11,3.72L10.54,2H9.46L9,3.72a.5.5,0,0,1-.32.34l-.48.15a6.06,6.06,0,0,0-.93.41l-.45.23a.48.48,0,0,1-.48,0L4.72,4,4,4.71l.89,1.58a.51.51,0,0,1,0,.48l-.23.45a6.8,6.8,0,0,0-.38.93l-.15.47A.49.49,0,0,1,3.75,9L2,9.45v1.08L3.74,11a.5.5,0,0,1,.34.32l.15.48a5.74,5.74,0,0,0,.39.93l.23.45a.47.47,0,0,1,0,.47L4,15.28l.75.75,1.58-.89a.51.51,0,0,1,.48,0l.45.24a7,7,0,0,0,.93.4l.48.15a.5.5,0,0,1,.32.34Z"
                                            ></path>
                                            <path
                                              className="tool-dark"
                                              d="M10.05,12.83a2.74,2.74,0,1,1,2.74-2.74A2.74,2.74,0,0,1,10.05,12.83Z"
                                            ></path>
                                            <path
                                              className="tool-white"
                                              d="M10.05,8.36a1.74,1.74,0,1,0,1.74,1.73A1.74,1.74,0,0,0,10.05,8.36Z"
                                            ></path>
                                          </svg>
                                        </span>
                                      </button>
                                      <ul className="dropdown-menu modern_menu dropdown-menu-right hidden">
                                        <li className="disabled bg-warning">
                                          <a
                                            href="#"
                                            className="i"
                                            style={{ whiteSpace: "normal" }}
                                          >
                                            Please log in or create an account
                                            to use the default settings feature.{" "}
                                          </a>
                                        </li>
                                        <li
                                          role="separator"
                                          className="divider"
                                        ></li>
                                        <li className="CmApp-StickySettings-set disabled">
                                          <a className="SettingsGroups-Shadows-Perspective-setStickyToCurrent disabled">
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              viewBox="0 0 15 15"
                                            >
                                              <path
                                                className="tool-dark"
                                                d="M10.5,7.79a2.61,2.61,0,0,1,.48,0l3.16-3.56L12.64,3l-6.5,7.34L2.65,7.19,1.32,8.69l5,4.43,1.62-1.84a2.56,2.56,0,0,1-.13-.79A2.71,2.71,0,0,1,10.5,7.79Z"
                                              ></path>
                                              <path
                                                className="tool-light"
                                                d="M10.5,9a1.41,1.41,0,0,0-.7.19,1.48,1.48,0,0,0-.7.78,1.61,1.61,0,0,0-.1.53A1.5,1.5,0,1,0,10.5,9Z"
                                              ></path>
                                            </svg>
                                            <span className="CmApp-StickySettings-enabled">
                                              Set as new default
                                            </span>
                                            <span className="CmApp-StickySettings-disabled">
                                              Using Default
                                            </span>
                                          </a>
                                        </li>

                                        <li className="CmApp-StickySettings-reset disabled">
                                          <a className="SettingsGroups-Shadows-Perspective-setCurrentToDefault disabled">
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              viewBox="0 0 15 15"
                                            >
                                              <circle
                                                className="tool-light"
                                                cx="8.5"
                                                cy="7.5"
                                                r="1.5"
                                              ></circle>
                                              <path
                                                className="tool-dark"
                                                d="M8.19,1.6a6,6,0,0,0-6,5.59l-.69-.71-1.07,1L3,10.06,5.43,7.58,4.37,6.52l-.63.64a4.49,4.49,0,0,1,9,.45h1.5A6,6,0,0,0,8.19,1.6Z"
                                              ></path>
                                            </svg>
                                            <span>Reset to default</span>
                                          </a>
                                        </li>
                                        <li
                                          role="separator"
                                          className="divider"
                                        ></li>
                                        <li className="CmApp-StickySettings-factory disabled">
                                          <a className="SettingsGroups-Shadows-Perspective-setCurrentAndStickyToFactory disabled">
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              viewBox="0 0 15 15"
                                            >
                                              <path
                                                className="tool-dark"
                                                d="M8.18,1.49a6,6,0,0,0-6,5.64l-.69-.7L.42,7.48,2.92,10,5.4,7.53,4.34,6.47l-.64.64a4.47,4.47,0,1,1,1,3.26l-1.16,1a6,6,0,0,0,8.9.42A5.93,5.93,0,0,0,14.19,7.5,6,6,0,0,0,8.18,1.49Z"
                                              ></path>
                                              <circle
                                                className="tool-light"
                                                cx="8.53"
                                                cy="7.5"
                                                r="1.5"
                                              ></circle>
                                            </svg>
                                            <span>Restore factory default</span>
                                          </a>
                                        </li>
                                        <li
                                          role="separator"
                                          className="divider"
                                        ></li>
                                        <li className="">
                                          <a className="sticky_settings">
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              viewBox="0 0 15 15"
                                            >
                                              <rect
                                                className="tool-dark"
                                                x="5.83"
                                                y="2.87"
                                                width="7.99"
                                                height="1.33"
                                                transform="translate(19.66 7.08) rotate(180)"
                                              ></rect>
                                              <rect
                                                className="tool-dark"
                                                x="5.83"
                                                y="6.87"
                                                width="7.99"
                                                height="1.33"
                                                transform="translate(19.66 15.07) rotate(180)"
                                              ></rect>
                                              <rect
                                                className="tool-dark"
                                                x="5.83"
                                                y="10.87"
                                                width="7.99"
                                                height="1.33"
                                                transform="translate(19.66 23.07) rotate(180)"
                                              ></rect>
                                              <circle
                                                className="tool-light"
                                                cx="2.47"
                                                cy="7.5"
                                                r="1.33"
                                              ></circle>
                                              <circle
                                                className="tool-light"
                                                cx="2.47"
                                                cy="3.48"
                                                r="1.33"
                                              ></circle>
                                              <circle
                                                className="tool-light"
                                                cx="2.47"
                                                cy="11.53"
                                                r="1.33"
                                              ></circle>
                                            </svg>
                                            <span>Show all defaults</span>
                                          </a>
                                        </li>
                                      </ul>
                                    </div>
                                  </div>
                                  <div
                                    className="CmApp-ShadowApp-PerspectiveShadow-controls"
                                    style={{ display: "none" }}
                                  >
                                    <table className="table table-condensed CmApp-SubApps-table">
                                      <tbody>
                                        <tr className="CmApp-ShadowApp-PerspectiveShadow-ShadowOpacity-container CmApp-SubApps-unit_row">
                                          <td>Opacity:</td>
                                          <td>
                                            <span className="CmApp-ShadowApp-PerspectiveShadow-ShadowOpacity-display">
                                              25%
                                            </span>
                                          </td>
                                          <td>
                                            <div
                                              style={{ display: "inline-flex" }}
                                            >
                                              <div className="app_bttn_group">
                                                <button
                                                  title="More transparent"
                                                  className="app_bttn  app_bttn_dark CmApp-ShadowApp-PerspectiveShadow-ShadowOpacity-decrease"
                                                  alt="More transparent"
                                                  id="CmApp-ShadowApp-PerspectiveShadow-ShadowOpacity-decrease"
                                                >
                                                  <span>-</span>
                                                </button>
                                                <button
                                                  title="More opaque"
                                                  className="app_bttn  app_bttn_dark CmApp-ShadowApp-PerspectiveShadow-ShadowOpacity-increase"
                                                  alt="More opaque"
                                                  id="CmApp-ShadowApp-PerspectiveShadow-ShadowOpacity-increase"
                                                >
                                                  <span>+</span>
                                                </button>
                                              </div>
                                              <div className="app_bttn_group">
                                                <button
                                                  title="Reset"
                                                  className="disabled app_bttn  app_bttn_dark CmApp-ShadowApp-PerspectiveShadow-ShadowOpacity-reset"
                                                  alt="Reset"
                                                  id="CmApp-ShadowApp-PerspectiveShadow-ShadowOpacity-reset"
                                                >
                                                  <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 20 20"
                                                  >
                                                    <path
                                                      className="tool-dark"
                                                      d="M11.13,5H4.59L6.74,2.85,6,2.15l-3,3a.5.5,0,0,0,0,.7l3,3,.71-.7L4.59,6h6.54A4.84,4.84,0,0,1,16,10.84v.32A4.84,4.84,0,0,1,11.13,16H3.88v1h7.25A5.85,5.85,0,0,0,17,11.16v-.32A5.85,5.85,0,0,0,11.13,5Z"
                                                    ></path>
                                                  </svg>
                                                </button>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>

                                        <tr className="CmApp-ShadowApp-PerspectiveShadow-OpacityScale-container CmApp-SubApps-unit_row">
                                          <td>Opacity Scale:</td>
                                          <td>
                                            <span className="CmApp-ShadowApp-PerspectiveShadow-OpacityScale-display">
                                              50%
                                            </span>
                                          </td>
                                          <td>
                                            <div
                                              style={{ display: "inline-flex" }}
                                            >
                                              <div className="app_bttn_group">
                                                <button
                                                  title="More transparent"
                                                  className="app_bttn  app_bttn_dark CmApp-ShadowApp-PerspectiveShadow-OpacityScale-decrease"
                                                  alt="More transparent"
                                                  id="CmApp-ShadowApp-PerspectiveShadow-OpacityScale-decrease"
                                                >
                                                  <span>-</span>
                                                </button>
                                                <button
                                                  title="More opaque"
                                                  className="app_bttn  app_bttn_dark CmApp-ShadowApp-PerspectiveShadow-OpacityScale-increase"
                                                  alt="More opaque"
                                                  id="CmApp-ShadowApp-PerspectiveShadow-OpacityScale-increase"
                                                >
                                                  <span>+</span>
                                                </button>
                                              </div>
                                              <div className="app_bttn_group">
                                                <button
                                                  title="Reset"
                                                  className="disabled app_bttn  app_bttn_dark CmApp-ShadowApp-PerspectiveShadow-OpacityScale-reset"
                                                  alt="Reset"
                                                  id="CmApp-ShadowApp-PerspectiveShadow-OpacityScale-reset"
                                                >
                                                  <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 20 20"
                                                  >
                                                    <path
                                                      className="tool-dark"
                                                      d="M11.13,5H4.59L6.74,2.85,6,2.15l-3,3a.5.5,0,0,0,0,.7l3,3,.71-.7L4.59,6h6.54A4.84,4.84,0,0,1,16,10.84v.32A4.84,4.84,0,0,1,11.13,16H3.88v1h7.25A5.85,5.85,0,0,0,17,11.16v-.32A5.85,5.85,0,0,0,11.13,5Z"
                                                    ></path>
                                                  </svg>
                                                </button>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>

                                        <tr className="CmApp-ShadowApp-PerspectiveShadow-BlurRadius-container CmApp-SubApps-unit_row">
                                          <td>Blur Radius:</td>
                                          <td>
                                            <span className="CmApp-ShadowApp-PerspectiveShadow-BlurRadius-display">
                                              10px
                                            </span>
                                          </td>
                                          <td>
                                            <div
                                              style={{ display: "inline-flex" }}
                                            >
                                              <div className="app_bttn_group">
                                                <button
                                                  title="Blurrier"
                                                  className="app_bttn  app_bttn_dark CmApp-ShadowApp-PerspectiveShadow-BlurRadius-decrease"
                                                  alt="Blurrier"
                                                  id="CmApp-ShadowApp-PerspectiveShadow-BlurRadius-decrease"
                                                >
                                                  <span>-</span>
                                                </button>
                                                <button
                                                  title="Sharper"
                                                  className="app_bttn  app_bttn_dark CmApp-ShadowApp-PerspectiveShadow-BlurRadius-increase"
                                                  alt="Sharper"
                                                  id="CmApp-ShadowApp-PerspectiveShadow-BlurRadius-increase"
                                                >
                                                  <span>+</span>
                                                </button>
                                              </div>
                                              <div className="app_bttn_group">
                                                <button
                                                  title="Reset"
                                                  className="disabled app_bttn  app_bttn_dark CmApp-ShadowApp-PerspectiveShadow-BlurRadius-reset"
                                                  alt="Reset"
                                                  id="CmApp-ShadowApp-PerspectiveShadow-BlurRadius-reset"
                                                >
                                                  <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 20 20"
                                                  >
                                                    <path
                                                      className="tool-dark"
                                                      d="M11.13,5H4.59L6.74,2.85,6,2.15l-3,3a.5.5,0,0,0,0,.7l3,3,.71-.7L4.59,6h6.54A4.84,4.84,0,0,1,16,10.84v.32A4.84,4.84,0,0,1,11.13,16H3.88v1h7.25A5.85,5.85,0,0,0,17,11.16v-.32A5.85,5.85,0,0,0,11.13,5Z"
                                                    ></path>
                                                  </svg>
                                                </button>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>

                                        <tr className="CmApp-ShadowApp-PerspectiveShadow-BlurRadiusScale-container CmApp-SubApps-unit_row">
                                          <td>Blur Scale:</td>
                                          <td>
                                            <span className="CmApp-ShadowApp-PerspectiveShadow-BlurRadiusScale-display">
                                              400%
                                            </span>
                                          </td>
                                          <td>
                                            <div
                                              style={{ display: "inline-flex" }}
                                            >
                                              <div className="app_bttn_group">
                                                <button
                                                  title="Blurrier"
                                                  className="app_bttn  app_bttn_dark CmApp-ShadowApp-PerspectiveShadow-BlurRadiusScale-decrease"
                                                  alt="Blurrier"
                                                  id="CmApp-ShadowApp-PerspectiveShadow-BlurRadiusScale-decrease"
                                                >
                                                  <span>-</span>
                                                </button>
                                                <button
                                                  title="Sharper"
                                                  className="app_bttn  app_bttn_dark CmApp-ShadowApp-PerspectiveShadow-BlurRadiusScale-increase"
                                                  alt="Sharper"
                                                  id="CmApp-ShadowApp-PerspectiveShadow-BlurRadiusScale-increase"
                                                >
                                                  <span>+</span>
                                                </button>
                                              </div>
                                              <div className="app_bttn_group">
                                                <button
                                                  title="Reset"
                                                  className="disabled app_bttn  app_bttn_dark CmApp-ShadowApp-PerspectiveShadow-BlurRadiusScale-reset"
                                                  alt="Reset"
                                                  id="CmApp-ShadowApp-PerspectiveShadow-BlurRadiusScale-reset"
                                                >
                                                  <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 20 20"
                                                  >
                                                    <path
                                                      className="tool-dark"
                                                      d="M11.13,5H4.59L6.74,2.85,6,2.15l-3,3a.5.5,0,0,0,0,.7l3,3,.71-.7L4.59,6h6.54A4.84,4.84,0,0,1,16,10.84v.32A4.84,4.84,0,0,1,11.13,16H3.88v1h7.25A5.85,5.85,0,0,0,17,11.16v-.32A5.85,5.85,0,0,0,11.13,5Z"
                                                    ></path>
                                                  </svg>
                                                </button>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                                <hr style={{ marginTop: "8px" }} />
                              </div>
                              <div className="CmApp-SubApps-sec_footer">
                                <div style={{ display: "inline-block" }}>
                                  <div className="app_bttn_group">
                                    <div
                                      className="app_bttn app_bttn_white app_bttn_large"
                                      id="CmApp-ShadowApp-PreviewButton"
                                      style={{ display: "none" }}
                                    >
                                      Preview
                                    </div>
                                  </div>
                                </div>
                                <div className="pull-right">
                                  <div className="app_bttn_group">
                                    <button
                                      className="app_bttn app_bttn_white app_bttn_large"
                                      id="CmApp-ShadowApp-ResetButton"
                                    >
                                      Reset
                                    </button>
                                  </div>
                                  <div className="app_bttn_group">
                                    <button className="CmApp-ShadowApp-close_button CmApp-SubApps-subAppCloseButton app_bttn app_bttn_dark app_bttn_large">
                                      Ok
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </SideTab>
                      </SideTabsControl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }
}

export default IndividualPosterNew;
